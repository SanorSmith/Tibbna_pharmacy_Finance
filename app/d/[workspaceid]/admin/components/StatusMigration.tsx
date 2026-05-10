"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, PlayCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface MigrationResult {
  success: boolean;
  dryRun: boolean;
  stats: {
    ordersAnalyzed: number;
    ordersUpdated: number;
    samplesAnalyzed: number;
    samplesUpdated: number;
    errors: string[];
  };
  orderUpdates: Array<{
    orderid: string;
    currentStatus: string;
    newStatus: string;
    reason: string;
  }>;
  sampleUpdates: Array<{
    sampleid: string;
    samplenumber: string;
    currentStatus: string;
    newStatus: string;
    reason: string;
  }>;
  message: string;
}

export function StatusMigration() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const runMigration = async (dryRun: boolean) => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/lims/migrate-statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Migration failed");
      }

      setResult(data);
    } catch (error) {
      console.error("Migration error:", error);
      alert(error instanceof Error ? error.message : "Migration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>LIMS Status Migration</CardTitle>
        <CardDescription>
          Update existing orders and samples to correct statuses based on their current workflow state
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This migration updates existing orders and samples to match the new automated status transition system.
            Always run a preview first before applying changes.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            onClick={() => runMigration(true)}
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Preview Changes
              </>
            )}
          </Button>

          <Button
            onClick={() => runMigration(false)}
            disabled={loading || !result?.dryRun}
            variant="default"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Apply Changes
              </>
            )}
          </Button>
        </div>

        {result && (
          <div className="space-y-4">
            <Alert variant={result.success ? "default" : "destructive"}>
              <AlertDescription>
                <div className="font-semibold mb-2">{result.message}</div>
                <div className="text-sm space-y-1">
                  <div>Orders analyzed: {result.stats.ordersAnalyzed}</div>
                  <div>Orders to update: {result.orderUpdates.length}</div>
                  <div>Samples analyzed: {result.stats.samplesAnalyzed}</div>
                  <div>Samples to update: {result.sampleUpdates.length}</div>
                  {result.stats.errors.length > 0 && (
                    <div className="text-red-600">Errors: {result.stats.errors.length}</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? "Hide Details" : "Show Details"}
            </Button>

            {showDetails && (
              <div className="space-y-4 text-sm">
                {result.orderUpdates.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Order Updates:</h4>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {result.orderUpdates.map((update, idx) => (
                        <div key={idx} className="border-l-2 border-blue-500 pl-2 py-1">
                          <div className="font-mono text-xs">{update.orderid}</div>
                          <div>
                            {update.currentStatus} → {update.newStatus}
                          </div>
                          <div className="text-gray-600">{update.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.sampleUpdates.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Sample Updates:</h4>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {result.sampleUpdates.map((update, idx) => (
                        <div key={idx} className="border-l-2 border-green-500 pl-2 py-1">
                          <div className="font-mono text-xs">{update.samplenumber}</div>
                          <div>
                            {update.currentStatus} → {update.newStatus}
                          </div>
                          <div className="text-gray-600">{update.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.stats.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Errors:</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {result.stats.errors.map((error, idx) => (
                        <div key={idx} className="text-red-600 text-xs">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
