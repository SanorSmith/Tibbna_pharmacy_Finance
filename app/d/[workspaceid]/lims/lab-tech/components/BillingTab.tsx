/**
 * Billing Tab Component
 * - Billing and invoicing
 */
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingTab({ workspaceid: _workspaceid }: { workspaceid: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>Billing and payment processing</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>Billing management.</p>
          <p className="text-sm mt-2">Process payments and generate invoices.</p>
        </div>
      </CardContent>
    </Card>
  );
}
