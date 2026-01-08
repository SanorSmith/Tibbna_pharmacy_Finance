/**
 * Contacts Tab Component
 * - Contact management
 */
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContactsTab({ workspaceid: _workspaceid }: { workspaceid: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacts</CardTitle>
        <CardDescription>Manage contacts and communication</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>Contact directory.</p>
          <p className="text-sm mt-2">View and manage your contacts.</p>
        </div>
      </CardContent>
    </Card>
  );
}
