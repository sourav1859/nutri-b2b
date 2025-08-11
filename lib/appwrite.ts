// /lib/appwrite.ts
import { Client, Databases, Storage, Functions } from "appwrite";

export const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const db = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
