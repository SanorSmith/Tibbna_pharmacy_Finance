/**
 * Notification Tab Component
 * - System notifications and alerts
 */
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotificationTab({ workspaceid }: { workspaceid: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>System alerts and notifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>No new notifications.</p>
          <p className="text-sm mt-2">Important alerts will appear here.</p>
        </div>
      </CardContent>
    </Card>
  );
}
