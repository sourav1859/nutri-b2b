// functions/pullVendorApi/index.js
import { makeClients } from "./client.js";
import { productSchema, upsertProduct, permsForTeam } from "./utils.js";
import { ID, Query } from "appwrite";
import pLimit from "p-limit";

/**
 * Trigger: Schedule (cron) in Function settings.
 * Docs show schedules & examples. :contentReference[oaicite:6]{index=6}
 */
export default async ({ req, res, log }) => {
  const { DB_ID, COL_VSOURCES, COL_INGEST } = process.env;
  const { db } = makeClients();

  // Load enabled sources for all vendors
  const srcs = await db.listDocuments(DB_ID, COL_VSOURCES, [ Query.equal("enabled", true), Query.limit(100) ]);

  const results = [];
  for (const src of srcs.documents) {
    const vendorTeamId = src.vendorTeamId;
    const job = await db.createDocument(DB_ID, COL_INGEST, ID.unique(), {
      vendorTeamId, sourceType: "api_pull", status: "processing",
      total: 0, success: 0, failed: 0, startedAt: new Date().toISOString()
    }, permsForTeam(vendorTeamId));

    let success = 0, failed = 0, total = 0;

    try {
      const headers = await buildAuthHeaders(src);
      // Fetch one page (adapt to your vendor’s paging schema)
      const r = await fetch(src.endpoint, { headers });
      if (!r.ok) throw new Error(`fetch ${r.status}`);
      const payload = await r.json();

      const items = Array.isArray(payload.items) ? payload.items : (Array.isArray(payload) ? payload : []);
      total = items.length;

      const run = pLimit(14);
      await Promise.all(items.map((raw) => run(async () => {
        try {
          for (const k of ["calories","carbs_g","sugar_g","fat_g","sat_fat_g","protein_g","fiber_g","sodium_mg"]) {
            if (raw[k] != null) raw[k] = Number(raw[k]);
          }
          const data = productSchema.parse({ ...raw, vendorTeamId });
          await upsertProduct(db, process.env, data);
          success++;
        } catch (e) { failed++; log(String(e)); }
      })));

      // Save cursor if vendor provides one (example)
      if (payload.nextCursor) {
        await db.updateDocument(DB_ID, COL_VSOURCES, src.$id, { cursorJson: JSON.stringify({ next: payload.nextCursor }) });
      }

      await db.updateDocument(DB_ID, COL_INGEST, job.$id, {
        total, success, failed, status: "done", finishedAt: new Date().toISOString()
      });

      results.push({ vendorTeamId, jobId: job.$id, total, success, failed });
    } catch (e) {
      await db.updateDocument(DB_ID, COL_INGEST, job.$id, { status: "failed", finishedAt: new Date().toISOString() });
      log(String(e));
    }
  }

  return res.json({ results });
};

async function buildAuthHeaders(src) {
  switch (src.authType) {
    case "apiKey": return { Authorization: `ApiKey ${src.apiKey}` };
    case "basic":  return { Authorization: "Basic " + Buffer.from(`${src.username}:${src.password}`).toString("base64") };
    case "bearer": return { Authorization: `Bearer ${src.bearerToken}` };
    case "hmac":   return { "X-Signature": src.hmacSecret }; // customize per vendor
    default:       return {};
  }
}
