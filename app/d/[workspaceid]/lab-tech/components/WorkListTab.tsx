/**
 * Work-list Tab Component
 * - Displays current work queue for lab technician
 */
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function WorkListTab({ workspaceid }: { workspaceid: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Work-list</CardTitle>
        <CardDescription>Your current work queue and assigned tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>No items in your work-list.</p>
          <p className="text-sm mt-2">Assigned tasks will appear here.</p>
        </div>
      </CardContent>
    </Card>
  );
}
