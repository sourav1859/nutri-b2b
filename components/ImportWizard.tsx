// /components/ImportWizard.tsx
"use client";
import { storage, functions } from "@/lib/appwrite";
import { ID, Permission, Role } from "appwrite";
import { useState } from "react";

type Props = {
  bucketId: string;
  vendorTeamId: string;
  ingestFunctionId: string; // optional if you rely purely on the Storage event
  dbId: string;
  jobsColId: string;
};

export default function ImportWizard(p: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  async function onUpload() {
    if (!file) return;
    const permissions = [
      Permission.read(Role.team(p.vendorTeamId)),
      Permission.update(Role.team(p.vendorTeamId)),
      Permission.delete(Role.team(p.vendorTeamId)),
      Permission.create(Role.team(p.vendorTeamId)),
    ];

    // 1) Upload CSV
    const f = await storage.createFile(p.bucketId, ID.unique(), file, permissions);

    // 2) Either: rely on Storage event -> your ingestCsv runs automatically
    // Or: explicitly kick it via function execution (helpful for retries/manual runs)
    if (p.ingestFunctionId) {
      await functions.createExecution(p.ingestFunctionId, JSON.stringify({
        vendorTeamId: p.vendorTeamId,
        fileId: f.$id,
        target: "products"
      }));
    }

    // 3) (Optional) show job right away if your ingestApi returns an id; otherwise
    // listen to last job for this team, or show “processing started”.
    alert("Uploaded. Ingestion will start shortly.");
  }

  return (
    <div className="space-y-3">
      <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={onUpload} className="px-4 py-2 rounded bg-black text-white">
        Upload & Ingest
      </button>
    </div>
  );
}
