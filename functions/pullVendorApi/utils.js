// functions/pullVendorApi/utils.js
import { z } from "zod";
import { ID, Permission, Role, Query } from "appwrite";

export const productSchema = z.object({
  vendorTeamId: z.string(),
  sku: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["active","inactive"]).default("active"),
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

export async function upsertProduct(db, env, data) {
  const list = await db.listDocuments(env.DB_ID, env.COL_PRODUCTS, [
    Query.equal("vendorTeamId", data.vendorTeamId),
    Query.equal("sku", data.sku),
    Query.limit(1),
  ]);
  if (list.total) {
    return db.updateDocument(env.DB_ID, env.COL_PRODUCTS, list.documents[0].$id, data, permsForTeam(data.vendorTeamId));
  }
  return db.createDocument(env.DB_ID, env.COL_PRODUCTS, ID.unique(), data, permsForTeam(data.vendorTeamId));
}
