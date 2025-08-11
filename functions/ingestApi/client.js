// functions/ingestApi/client.js
import { Client, Databases } from "appwrite";
export function makeClients() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  return { db: new Databases(client) };
}
