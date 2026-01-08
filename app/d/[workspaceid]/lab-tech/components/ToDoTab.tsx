/**
 * To Do Tab Component
 * - Task management and to-do list
 */
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ToDoTab({ workspaceid: _workspaceid }: { workspaceid: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>To Do</CardTitle>
        <CardDescription>Your tasks and to-do list</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>No pending tasks.</p>
          <p className="text-sm mt-2">Your to-do items will appear here.</p>
        </div>
      </CardContent>
    </Card>
  );
}
