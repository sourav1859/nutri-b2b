// functions/ingestCsv/index.js
import { makeClients } from "./client.js";
import { ID, Query } from "appwrite";
import { parse } from "csv-parse/sync";
import { productSchema, upsertProduct, applyMapping, permsForTeam, limit } from "./utils.js";

/**
 * Trigger: buckets.<BUCKET_ID>.files.*.create
 * Only process when the *final chunk* arrives (uploads are chunked).
 * Docs: storage events & chunk note. :contentReference[oaicite:0]{index=0}
 */
export default async ({ req, res, log }) => {
  const { DB_ID, COL_PRODUCTS, COL_INGEST, COL_VMAP, BUCKET_ID } = process.env;
  const event = JSON.parse(req.variables.APPWRITE_FUNCTION_EVENT_DATA || "{}"); // event payload. :contentReference[oaicite:1]{index=1}

  // Guard: ignore partial chunk events
  if (event?.chunksUploaded !== undefined && event?.chunksUploaded !== event?.chunksTotal) {
    return res.json({ skipped: true, reason: "partial chunk" });
  }

  // Accept explicit invocations too (manual retry)
  const q = req.query || {};
  const b = req.bodyJson ?? {};
  const fileId = event?.$id || event?.fileId || q.fileId || b.fileId;
  const vendorTeamId = q.vendorTeamId || b.vendorTeamId;
  const target = q.target || b.target || "products";
  if (!fileId || !vendorTeamId) return res.send("fileId & vendorTeamId are required", 400);

  const { db, storage } = makeClients();

  // Create job (Realtime will stream updates based on these perms). :contentReference[oaicite:2]{index=2}
  const job = await db.createDocument(DB_ID, COL_INGEST, ID.unique(), {
    vendorTeamId, sourceType: `csv_${target}`, status: "processing",
    fileId, total: 0, success: 0, failed: 0, startedAt: new Date().toISOString()
  }, permsForTeam(vendorTeamId));

  try {
    // Download file (Server SDK download). :contentReference[oaicite:3]{index=3}
    const buf = await storage.getFileDownload(BUCKET_ID, fileId);
    const text = Buffer.isBuffer(buf) ? buf.toString("utf8") : new TextDecoder().decode(buf);

    // Load vendor mapping
    const vm = await db.listDocuments(DB_ID, COL_VMAP, [
      Query.equal("vendorTeamId", vendorTeamId),
      Query.equal("target", target),
      Query.limit(1),
    ]);
    const mapping = vm.total ? vm.documents[0] : null;

    // Parse → map → validate → upsert
    const rows = parse(text, { columns: true, skip_empty_lines: true });
    let total = 0, success = 0, failed = 0;
    const errors = [];

    await Promise.all(rows.map((row, idx) => limit(async () => {
      total++;
      try {
        const mapped = applyMapping(row, mapping);
        // numeric coercion for known numeric fields
        for (const k of ["calories","carbs_g","sugar_g","fat_g","sat_fat_g","protein_g","fiber_g","sodium_mg"]) {
          if (mapped[k] != null) mapped[k] = Number(mapped[k]);
        }
        const data = productSchema.parse({ ...mapped, vendorTeamId, status: mapped.status || "active" });
        await upsertProduct(db, { DB_ID, COL_PRODUCTS }, data);
        success++;
      } catch (e) {
        failed++; errors.push({ row: idx + 1, error: String(e.message || e) });
      }
    })));

    // Optional: write error CSV back to Storage
    let errorFileId = null;
    if (errors.length) {
      const csv = "row,error\n" + errors.map(r => `${r.row},"${r.error.replaceAll('"','""')}"`).join("\n");

      // For SDK <=14.1 use InputFile.fromBuffer; for >=14.2 new global File works. :contentReference[oaicite:4]{index=4}
      let fileInput;
      try {
        // Appwrite Node SDK >=14.2.0
        fileInput = new File([Buffer.from(csv, "utf8")], "errors.csv", { type: "text/csv" });
      } catch {
        // Fallback for older SDKs:
        const { InputFile } = await import("node-appwrite/file"); // older docs call it 'node-appwrite/file'
        fileInput = InputFile.fromBuffer(Buffer.from(csv, "utf8"), "errors.csv");
      }

      const efile = await storage.createFile(BUCKET_ID, ID.unique(), fileInput, permsForTeam(vendorTeamId));
      errorFileId = efile.$id;
    }

    await db.updateDocument(DB_ID, COL_INGEST, job.$id, {
      total, success, failed, status: "done", errorFileId, finishedAt: new Date().toISOString()
    });

    return res.json({ jobId: job.$id, total, success, failed, errorFileId });
  } catch (err) {
    await db.updateDocument(DB_ID, COL_INGEST, job.$id, { status: "failed", finishedAt: new Date().toISOString() });
    log(String(err));
    return res.send("ingestCsv failed", 500);
  }
};
