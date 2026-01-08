/**
 * Insurance Tab Component
 * - Insurance verification and claims
 */
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function InsuranceTab({ workspaceid: _workspaceid }: { workspaceid: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Insurance</CardTitle>
        <CardDescription>Insurance verification and claims management</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>Insurance management.</p>
          <p className="text-sm mt-2">Verify coverage and manage claims.</p>
        </div>
      </CardContent>
    </Card>
  );
}
