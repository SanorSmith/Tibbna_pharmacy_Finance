/**
 * Lab Management Tab Component
 * - Laboratory management and settings
 */
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LabManagementTab({ workspaceid }: { workspaceid: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lab Management</CardTitle>
        <CardDescription>Laboratory settings and configuration</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>Laboratory management tools.</p>
          <p className="text-sm mt-2">Configure lab settings and equipment.</p>
        </div>
      </CardContent>
    </Card>
  );
}
