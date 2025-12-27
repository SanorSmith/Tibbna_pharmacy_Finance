/**
 * Orders Tab Component
 * - Displays lab test orders
 */
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrdersTab({ workspaceid }: { workspaceid: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lab Orders</CardTitle>
        <CardDescription>View and manage incoming lab test orders</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>No pending orders at this time.</p>
          <p className="text-sm mt-2">Orders will appear here when they are submitted.</p>
        </div>
      </CardContent>
    </Card>
  );
}
