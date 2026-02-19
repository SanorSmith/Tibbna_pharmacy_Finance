import { StatusMigration } from "../components/StatusMigration";

export default function LIMSMigrationPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">LIMS Status Migration</h1>
        <p className="text-gray-600 mt-2">
          Update existing orders and samples to match the new automated status transition system
        </p>
      </div>

      <StatusMigration />

      <div className="mt-8 space-y-4 text-sm text-gray-600">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">What this migration does:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Updates order statuses based on sample workflow state</li>
            <li>Updates sample statuses based on worklist assignments and results</li>
            <li>Creates full audit trail for all changes</li>
            <li>Safe to run multiple times (idempotent)</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Order Status Rules:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>REQUESTED</strong> → No samples collected yet</li>
            <li><strong>ACCEPTED</strong> → Samples collected (RECEIVED/IN_STORAGE)</li>
            <li><strong>IN_PROGRESS</strong> → Samples being processed (IN_PROCESS/ANALYZED)</li>
            <li><strong>COMPLETED</strong> → All samples have released results (ANALYZED)</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Sample Status Rules:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>RECEIVED</strong> → Default state after accession</li>
            <li><strong>IN_PROCESS</strong> → Sample is on a worklist</li>
            <li><strong>ANALYZED</strong> → Results have been released</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
