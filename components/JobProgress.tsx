// /components/JobProgress.tsx
"use client";
import { useJobStream } from "@/hooks/useJobStream";

export default function JobProgress({ dbId, colId, jobId }: { dbId: string; colId: string; jobId: string }) {
  const job = useJobStream(dbId, colId, jobId);
  if (!job) return null;
  const pct = job.total ? Math.round(((job.success + job.failed) / job.total) * 100) : (job.status === "done" ? 100 : 0);
  return (
    <div className="space-y-1">
      <div className="text-sm">Status: {job.status}</div>
      <div className="h-2 bg-gray-200 rounded">
        <div className="h-2 bg-green-600 rounded" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-gray-600">
        {job.success}/{job.total} ok • {job.failed} failed
      </div>
    </div>
  );
}
