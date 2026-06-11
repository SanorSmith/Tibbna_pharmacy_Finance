"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bell, Plus, Trash2, CheckCircle2, Circle, Pencil, User, Mail, MailOpen } from "lucide-react";

interface Reminder {
  reminderid: string;
  title: string;
  description: string | null;
  patientid: string | null;
  patientname: string | null;
  reminderdate: string | null;
  completed: boolean;
  isread: boolean;
  priority: string;
  createdat: string;
}

interface Props {
  workspaceid: string;
}

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

export default function PatientReminder({ workspaceid }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    patientname: "",
    reminderdate: "",
    priority: "medium",
  });

  const { data, isLoading } = useQuery<{ reminders: Reminder[] }>({
    queryKey: ["patient-reminders", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/patient-reminders`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`/api/d/${workspaceid}/patient-reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-reminders", workspaceid] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ reminderid, updates }: { reminderid: string; updates: Record<string, unknown> }) => {
      const res = await fetch(`/api/d/${workspaceid}/patient-reminders/${reminderid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-reminders", workspaceid] });
      setDialogOpen(false);
      setEditingReminder(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reminderid: string) => {
      const res = await fetch(`/api/d/${workspaceid}/patient-reminders/${reminderid}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-reminders", workspaceid] });
    },
  });

  const resetForm = () =>
    setForm({ title: "", description: "", patientname: "", reminderdate: "", priority: "medium" });

  const openNew = () => {
    setEditingReminder(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (r: Reminder) => {
    setEditingReminder(r);
    setForm({
      title: r.title,
      description: r.description || "",
      patientname: r.patientname || "",
      reminderdate: r.reminderdate ? r.reminderdate.slice(0, 10) : "",
      priority: r.priority,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editingReminder) {
      updateMutation.mutate({ reminderid: editingReminder.reminderid, updates: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleComplete = (r: Reminder) => {
    updateMutation.mutate({ reminderid: r.reminderid, updates: { completed: !r.completed } });
  };

  const toggleRead = (r: Reminder) => {
    updateMutation.mutate({ reminderid: r.reminderid, updates: { isread: !r.isread } });
  };

  const reminders = data?.reminders || [];
  const pending = reminders.filter((r) => !r.completed);
  const done = reminders.filter((r) => r.completed);

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Patient Reminders
          {pending.length > 0 && (
            <Badge className="bg-[#618FF5] text-white text-xs ml-1">{pending.length}</Badge>
          )}
        </CardTitle>
        <Button size="sm" className="h-7 text-xs bg-[#618FF5] text-white hover:bg-[#4a7ae0] gap-1" onClick={openNew}>
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
        ) : reminders.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No reminders yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-[320px] overflow-auto">
            {pending.map((r) => (
              <ReminderRow key={r.reminderid} reminder={r} onToggle={toggleComplete} onToggleRead={toggleRead} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} />
            ))}
            {done.length > 0 && (
              <>
                {pending.length > 0 && <div className="border-t my-2" />}
                {done.map((r) => (
                  <ReminderRow key={r.reminderid} reminder={r} onToggle={toggleComplete} onToggleRead={toggleRead} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} />
                ))}
              </>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditingReminder(null); resetForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingReminder ? "Edit Reminder" : "New Patient Reminder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Title *</label>
              <Input
                className="h-8 text-sm"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Follow-up for blood pressure check"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Patient Name</label>
              <Input
                className="h-8 text-sm"
                value={form.patientname}
                onChange={(e) => setForm((p) => ({ ...p, patientname: e.target.value }))}
                placeholder="Patient name (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Reminder Date</label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={form.reminderdate}
                  onChange={(e) => setForm((p) => ({ ...p, reminderdate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Priority</label>
                <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Notes</label>
              <Textarea
                className="text-sm resize-none h-20"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setDialogOpen(false); setEditingReminder(null); resetForm(); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#618FF5] text-white hover:bg-[#4a7ae0]"
              onClick={handleSave}
              disabled={!form.title.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {editingReminder ? "Save" : "Add Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ReminderRow({
  reminder,
  onToggle,
  onToggleRead,
  onEdit,
  onDelete,
}: {
  reminder: Reminder;
  onToggle: (r: Reminder) => void;
  onToggleRead: (r: Reminder) => void;
  onEdit: (r: Reminder) => void;
  onDelete: (id: string) => void;
}) {
  const isOverdue =
    !reminder.completed &&
    reminder.reminderdate &&
    new Date(reminder.reminderdate) < new Date();

  return (
    <div
      className={`flex items-start gap-2 p-2.5 rounded-md border text-sm transition-colors ${
        reminder.completed ? "opacity-50 bg-muted/30" : "bg-background"
      } ${isOverdue ? "border-red-200 bg-red-50/30 dark:bg-red-950/10" : ""}`}
    >
      <button
        className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-[#618FF5]"
        onClick={() => onToggle(reminder)}
      >
        {reminder.completed ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate flex items-center gap-1.5 ${reminder.completed ? "line-through text-muted-foreground" : ""}`}>
          {!reminder.isread && !reminder.completed && (
            <span className="h-1.5 w-1.5 rounded-full bg-[#618FF5] flex-shrink-0" title="Unread" />
          )}
          {reminder.title}
        </p>
        {reminder.patientname && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <User className="h-3 w-3" />
            {reminder.patientname}
          </p>
        )}
        {reminder.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {reminder.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {reminder.reminderdate && (
            <span className={`text-[10px] ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
              {new Date(reminder.reminderdate).toLocaleDateString()}
              {isOverdue && " (overdue)"}
            </span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityColors[reminder.priority] || priorityColors.medium}`}>
            {reminder.priority}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => onToggleRead(reminder)}
          title={reminder.isread ? "Mark as unread" : "Mark as read"}
        >
          {reminder.isread ? <MailOpen className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(reminder)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(reminder.reminderid)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
