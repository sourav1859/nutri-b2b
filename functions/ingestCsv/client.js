// functions/ingestCsv/client.js
import { Client, Databases, Storage, Functions } from "appwrite";

export function makeClients() {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const project  = process.env.APPWRITE_PROJECT_ID;
  const apiKey   = process.env.APPWRITE_API_KEY;

  const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
  return {
    client,
    db: new Databases(client),
    storage: new Storage(client),
    fx: new Functions(client),
  };
}
