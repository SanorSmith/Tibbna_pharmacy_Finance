/**
 * Sample Store Tab Component
 * - Sample storage and tracking
 */
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SampleStoreTab({ workspaceid }: { workspaceid: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sample Store</CardTitle>
        <CardDescription>Manage sample storage and inventory</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>Sample storage management.</p>
          <p className="text-sm mt-2">Track and manage stored samples.</p>
        </div>
      </CardContent>
    </Card>
  );
}
