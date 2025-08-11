// functions/ingestApi/index.js
import pLimit from "p-limit";
import { makeClients } from "./client.js";
import { productSchema, upsertProduct, permsForTeam } from "./utils.js";
import { ID } from "appwrite";

/**
 * Trigger: HTTP (Create Execution). You can call a Function over REST/SDK. :contentReference[oaicite:5]{index=5}
 */
export default async ({ req, res, log }) => {
  const { DB_ID, COL_INGEST } = process.env;
  const API_KEY = process.env.INGEST_API_KEY;
  const key = req.headers["x-api-key"];
  if (!API_KEY || key !== API_KEY) return res.send("Unauthorized", 401);

  const body = req.bodyJson ?? JSON.parse(req.body || "{}");
  const { vendorTeamId, items } = body || {};
  if (!vendorTeamId || !Array.isArray(items)) return res.send("Bad body", 400);

  const { db } = makeClients();

  const job = await db.createDocument(DB_ID, COL_INGEST, ID.unique(), {
    vendorTeamId, sourceType: "api_push", status: "processing",
    total: items.length, success: 0, failed: 0, startedAt: new Date().toISOString()
  }, permsForTeam(vendorTeamId));

  let success = 0, failed = 0;
  const run = pLimit(16);
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

  await db.updateDocument(DB_ID, COL_INGEST, job.$id, {
    success, failed, status: "done", finishedAt: new Date().toISOString()
  });

  return res.json({ jobId: job.$id, success, failed });
};
