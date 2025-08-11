// functions/ingestCsv/utils.js
import { Permission, Role, ID, Query } from "appwrite";
import { z } from "zod";
import pLimit from "p-limit";

export const productSchema = z.object({
  vendorTeamId: z.string(),
  sku: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional().nullable(),
  status: z.enum(["active","inactive"]),
  tags: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  ingredients: z.array(z.string()).default([]),
  calories: z.number().optional(),
  carbs_g: z.number().optional(),
  sugar_g: z.number().optional(),
  fat_g: z.number().optional(),
  sat_fat_g: z.number().optional(),
  protein_g: z.number().optional(),
  fiber_g: z.number().optional(),
  sodium_mg: z.number().optional(),
});

export function permsForTeam(teamId) {
  return [
    Permission.read(Role.team(teamId)),
    Permission.update(Role.team(teamId)),
    Permission.delete(Role.team(teamId)),
    Permission.create(Role.team(teamId)),
  ];
}

export async function upsertProduct(db, { DB_ID, COL_PRODUCTS }, data) {
  const { vendorTeamId, sku } = data;
  const existing = await db.listDocuments(DB_ID, COL_PRODUCTS, [
    Query.equal("vendorTeamId", vendorTeamId),
    Query.equal("sku", sku),
    Query.limit(1),
  ]);
  if (existing.total) {
    return db.updateDocument(DB_ID, COL_PRODUCTS, existing.documents[0].$id, data, permsForTeam(vendorTeamId));
  }
  return db.createDocument(DB_ID, COL_PRODUCTS, ID.unique(), data, permsForTeam(vendorTeamId));
}

/** JSON mapping helpers (header -> target, transforms, defaults) */
export function applyMapping(row, mappingDoc) {
  const map = mappingDoc?.headerMapJson ? JSON.parse(mappingDoc.headerMapJson) : {};
  const transforms = mappingDoc?.transformsJson ? JSON.parse(mappingDoc.transformsJson) : {};
  const defaults = mappingDoc?.defaultsJson ? JSON.parse(mappingDoc.defaultsJson) : {};

  const out = {};
  for (const [src, v] of Object.entries(row)) {
    const dst = map[src] || src;
    out[dst] = v;
  }
  for (const [k, rule] of Object.entries(transforms)) {
    if (out[k] == null) continue;
    if (rule.startsWith("csvSplit(")) {
      const delim = rule.match(/csvSplit\((.+)\)/)?.[1] ?? ",";
      out[k] = String(out[k]).split(delim).map(s => s.trim()).filter(Boolean);
    } else if (rule === "number") {
      const n = Number(out[k]); out[k] = Number.isFinite(n) ? n : undefined;
    }
  }
  for (const [k, v] of Object.entries(defaults)) {
    if (out[k] == null || out[k] === "") out[k] = v;
  }
  return out;
}

export const limit = pLimit(12);
