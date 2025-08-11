// functions/pullVendorApi/client.js
import { Client, Databases } from "appwrite";
export function makeClients() {
  const c = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT)
                        .setProject(process.env.APPWRITE_PROJECT_ID)
                        .setKey(process.env.APPWRITE_API_KEY);
  return { db: new Databases(c) };
}
