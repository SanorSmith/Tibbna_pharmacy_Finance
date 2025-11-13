/**
 * Page: Labs List
 * - Display all labs for a workspace with inline add dialog
 * - Route: /d/[workspaceid]/lab
 */
"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TestTube, Mail, MapPin, Phone, Plus } from "lucide-react";
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
  params: { workspaceid: string };
}) {
  const router = useRouter();
  const { workspaceid } = params;
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch labs
  useEffect(() => {
    fetchLabs();
  }, [workspaceid]);

  async function fetchLabs() {
    try {
      const res = await fetch(`/api/d/${workspaceid}/labs`);
      if (!res.ok) throw new Error("Failed to fetch labs");
      const data = await res.json();
      setLabs(data.labs || []);
    } catch (err) {
      console.error("Error fetching labs:", err);
    } finally {
      setLoading(false);
    }
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

      const res = await fetch(`/api/d/${workspaceid}/labs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to register lab");
      }

      // Refresh the list
      await fetchLabs();
      setDialogOpen(false);
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
    } finally {
      setSubmitting(false);
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Lab
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Register New Lab</DialogTitle>
                <DialogDescription>
                  Add a new laboratory facility with contact information
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="e.g., lab@hospital.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      name="address"
                      placeholder="e.g., Building B, Floor 1, Room 105"
                      rows={3}
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
                    {submitting ? "Registering..." : "Register Lab"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    {lab.name}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">
                    ID: {lab.labid.slice(0, 8)}...
                  </CardDescription>
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
      </div>
    </div>
  );
}
