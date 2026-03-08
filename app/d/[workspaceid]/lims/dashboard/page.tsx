/**
 * Page: Labs List
 * - Display all labs for a workspace with inline add dialog
 * - Route: /d/[workspaceid]/lab
 */
"use client";
import { use, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TestTube, Mail, MapPin, Phone, Plus, Edit, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

type Lab = {
  labid: string;
  workspaceid: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdat: Date;
  updatedat: Date;
};

export default function LabsPage({
  params,
}: {
  params: Promise<{ workspaceid: string }>;
}) {
  const router = useRouter();
  const { workspaceid } = use(params);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [labToDelete, setLabToDelete] = useState<Lab | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch labs
  const fetchLabs = useCallback(async () => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/labs`);
      if (!res.ok) throw new Error("Failed to fetch labs");
      const data = await res.json();
      setLabs(data.labs || []);
    } catch (error) {
      console.error("Error fetching labs:", error);
    } finally {
      setLoading(false);
    }
  }, [workspaceid]);

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  function handleOpenAdd() {
    setEditingLab(null);
    setError(null);
    setDialogOpen(true);
  }

  function handleOpenEdit(lab: Lab) {
    setEditingLab(lab);
    setError(null);
    setDialogOpen(true);
  }

  function handleOpenDelete(lab: Lab) {
    setLabToDelete(lab);
    setDeleteDialogOpen(true);
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSubmitting(true);
    try {
      const name = String(formData.get("name") || "").trim();
      const phone = (formData.get("phone") as string) || undefined;
      const email = (formData.get("email") as string) || undefined;
      const address = (formData.get("address") as string) || undefined;

      if (!name) {
        throw new Error("Lab name is required");
      }

      const payload = { name, phone, email, address };
      const url = editingLab
        ? `/api/d/${workspaceid}/labs/${editingLab.labid}`
        : `/api/d/${workspaceid}/labs`;
      const method = editingLab ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${editingLab ? "update" : "register"} lab`);
      }

      // Refresh the list
      await fetchLabs();
      setDialogOpen(false);
      setEditingLab(null);
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!labToDelete) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/d/${workspaceid}/labs/${labToDelete.labid}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete lab");
      }

      await fetchLabs();
      setDeleteDialogOpen(false);
      setLabToDelete(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      alert(msg);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading labs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Lab Tests</h1>
            <p className="text-muted-foreground mt-2">
              Manage laboratory facilities and their contact information
            </p>
          </div>
          <Button onClick={handleOpenAdd} className="bg-blue-500 hover:bg-blue-600 ">
            <Plus className="h-4 w-4 mr-2" />
            Add Lab
          </Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingLab ? "Edit Lab" : "Register New Lab"}</DialogTitle>
                <DialogDescription>
                  {editingLab ? "Update laboratory facility information" : "Add a new laboratory facility with contact information"}
                </DialogDescription>
              </DialogHeader>
              <form action={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
                    {error}
                  </div>
                )}

                {/* Registration Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Registration</h3>
                  <div className="space-y-2">
                    <Label htmlFor="name">Lab Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., Clinical Lab, Pathology Lab, Microbiology Lab"
                      defaultValue={editingLab?.name || ""}
                      required
                    />
                  </div>
                </div>

                {/* Contact Details Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Contact Details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="e.g., +1 (555) 123-4567"
                      defaultValue={editingLab?.phone || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="e.g., lab@hospital.com"
                      defaultValue={editingLab?.email || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      name="address"
                      placeholder="e.g., Building B, Floor 1, Room 105"
                      rows={3}
                      defaultValue={editingLab?.address || ""}
                    />
                  </div>
                </div>

                <div className="flex gap-4 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : editingLab ? "Save Changes" : "Register Lab"}
                  </Button>
                </div>
              </form>
            </DialogContent>
        </Dialog>

        {labs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TestTube className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No labs yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Get started by creating your first lab
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Lab
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {labs.map((lab) => (
              <Card key={lab.labid} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <TestTube className="h-5 w-5" />
                        {lab.name}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">
                        ID: {lab.labid.slice(0, 8)}...
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(lab)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDelete(lab)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {lab.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{lab.phone}</span>
                    </div>
                  )}
                  {lab.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{lab.email}</span>
                    </div>
                  )}
                  {lab.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-muted-foreground">{lab.address}</span>
                    </div>
                  )}
                  {!lab.phone && !lab.email && !lab.address && (
                    <p className="text-sm text-muted-foreground italic">
                      No contact details available
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lab</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{labToDelete?.name}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
