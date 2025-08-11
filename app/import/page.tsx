// /app/import/page.tsx
import ImportWizard from "@/components/ImportWizard";
// optionally: fetch a recent job id and render <JobProgress ... />

export default function ImportPage() {
  return (
    <main className="p-6 max-w-xl">
      <h1 className="text-xl font-semibold mb-4">CSV Import</h1>
      <ImportWizard
        bucketId={process.env.NEXT_PUBLIC_BUCKET_ID!}
        vendorTeamId={process.env.NEXT_PUBLIC_VENDOR_TEAM_ID!}
        ingestFunctionId={process.env.NEXT_PUBLIC_INGEST_CSV_FN_ID! /* or undefined to rely on event */}
        dbId={process.env.NEXT_PUBLIC_DB_ID!}
        jobsColId={process.env.NEXT_PUBLIC_COL_INGEST!}
      />
    </main>
  );
}
