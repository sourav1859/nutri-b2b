// /lib/appwrite-server.ts
import { Client, Databases, Storage, Functions } from "node-appwrite";

export const serverClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

export const sdb = new Databases(serverClient);
export const sstorage = new Storage(serverClient);
export const sfx = new Functions(serverClient);
