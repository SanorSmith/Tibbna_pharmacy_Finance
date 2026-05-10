/**
 * Billing Page
 * - Billing and payment processing
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function BillingPage({ params }: PageProps) {
  const { workspaceid } = await params;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/d/${workspaceid}/doctor`}>
                
              </Link>
        <div>
          <h1 className="text-2xl font-bold">Billing Management</h1>
          <p className="text-muted-foreground mt-2">
            Billing and payment processing
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing & Payments</CardTitle>
          <CardDescription>Process payments and generate invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Billing management system.</p>
            <p className="text-sm mt-2">Process payments and generate invoices.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
