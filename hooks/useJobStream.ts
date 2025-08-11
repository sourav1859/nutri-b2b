// /hooks/useJobStream.ts
import { useEffect, useState } from "react";
import { client } from "@/lib/appwrite";

export function useJobStream(dbId: string, colId: string, jobId?: string) {
  const [doc, setDoc] = useState<any>(null);

  useEffect(() => {
    if (!jobId) return;
    const unsub = client.subscribe(
      `databases.${dbId}.collections.${colId}.documents.${jobId}`,
      (event) => setDoc(event.payload)
    );
    return () => unsub();
  }, [dbId, colId, jobId]);

  return doc;
}
