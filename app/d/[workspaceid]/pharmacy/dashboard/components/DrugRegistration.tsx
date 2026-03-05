"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Pencil,
  Loader2,
  X,
} from "lucide-react";

interface DrugRecord {
  drugid: string;
  name: string;
  genericname: string | null;
  atccode: string | null;
  form: string;
  strength: string;
  unit: string;
  barcode: string | null;
  manufacturer: string | null;
  nationalcode: string | null;
  category: string | null;
  description: string | null;
  interaction: string | null;
  warning: string | null;
  pregnancy: string | null;
  sideeffect: string | null;
  storagetype: string | null;
  indication: string | null;
  traffic: string | null;
  notes: string | null;
  insuranceapproved: boolean | null;
  requiresprescription: boolean;
  isactive: boolean;
  createdat: string;
}

const emptyForm = {
  name: "",
  genericname: "",
  nationalcode: "",
  category: "",
  form: "",
  strength: "",
  unit: "tablet",
  barcode: "",
  manufacturer: "",
  interaction: "",
  warning: "",
  pregnancy: "",
  sideeffect: "",
  storagetype: "",
  description: "",
  indication: "",
  traffic: "",
  notes: "",
  insuranceapproved: false,
  requiresprescription: true,
};

export default function DrugRegistration({ workspaceid }: { workspaceid: string }) {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<DrugRecord | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [drugToDelete, setDrugToDelete] = useState<DrugRecord | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ drugs: DrugRecord[] }>({
    queryKey: ["pharmacy-drugs", workspaceid, search],
    queryFn: async () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-drugs${qs}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const url = editingDrug
        ? `/api/d/${workspaceid}/pharmacy-drugs/${editingDrug.drugid}`
        : `/api/d/${workspaceid}/pharmacy-drugs`;
      const method = editingDrug ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-drugs"] });
      setDialogOpen(false);
      setEditingDrug(null);
      setFormData(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (drugid: string) => {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-drugs/${drugid}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-drugs"] });
      setDeleteDialogOpen(false);
      setDrugToDelete(null);
    },
  });

  const handleOpenNew = () => {
    setEditingDrug(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (drug: DrugRecord) => {
    setEditingDrug(drug);
    setFormData({
      name: drug.name,
      genericname: drug.genericname || "",
      nationalcode: drug.nationalcode || "",
      category: drug.category || "",
      form: drug.form,
      strength: drug.strength,
      unit: drug.unit,
      barcode: drug.barcode || "",
      manufacturer: drug.manufacturer || "",
      interaction: drug.interaction || "",
      warning: drug.warning || "",
      pregnancy: drug.pregnancy || "",
      sideeffect: drug.sideeffect || "",
      storagetype: drug.storagetype || "",
      description: drug.description || "",
      indication: drug.indication || "",
      traffic: drug.traffic || "",
      notes: drug.notes || "",
      insuranceapproved: drug.insuranceapproved ?? false,
      requiresprescription: drug.requiresprescription,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.form || !formData.strength) return;
    saveMutation.mutate(formData);
  };

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const drugList = data?.drugs || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Drug Registration</h2>
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search with product Drug or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      {/* Medication List */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Medication List</h3>
            <Button
              size="sm"
              className="h-8 bg-teal-600 hover:bg-teal-700 text-xs"
              onClick={handleOpenNew}
            >
              <Plus className="h-3 w-3 mr-1" />
              New registration
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
            </div>
          ) : drugList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No drugs registered. Click &quot;New registration&quot; to add one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-50">
                    <TableHead className="text-xs font-semibold w-10">#</TableHead>
                    <TableHead className="text-xs font-semibold">Drug</TableHead>
                    <TableHead className="text-xs font-semibold">National Code</TableHead>
                    <TableHead className="text-xs font-semibold">Category</TableHead>
                    <TableHead className="text-xs font-semibold">Dose Form</TableHead>
                    <TableHead className="text-xs font-semibold">Strength</TableHead>
                    <TableHead className="text-xs font-semibold">Insurance</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Edit</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drugList.map((drug, idx) => (
                    <TableRow key={drug.drugid} className="hover:bg-gray-50">
                      <TableCell className="text-sm text-blue-600 font-medium">{idx + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{drug.name}</TableCell>
                      <TableCell className="text-sm">{drug.nationalcode || "—"}</TableCell>
                      <TableCell className="text-sm">{drug.category || "—"}</TableCell>
                      <TableCell className="text-sm">{drug.form}</TableCell>
                      <TableCell className="text-sm">{drug.strength}</TableCell>
                      <TableCell>
                        {drug.insuranceapproved ? (
                          <Badge className="text-[10px] bg-green-500">Yes</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenEdit(drug)}>
                          <Pencil className="h-3.5 w-3.5 text-blue-500" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => { setDrugToDelete(drug); setDeleteDialogOpen(true); }}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDrug ? "Edit Drug" : "New Drug Registration"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Drug name *</Label>
                <Input className="h-8 text-sm" value={formData.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. Acrecil" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">National code</Label>
                <Input className="h-8 text-sm" value={formData.nationalcode} onChange={(e) => updateField("nationalcode", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Category</Label>
                <Input className="h-8 text-sm" value={formData.category} onChange={(e) => updateField("category", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Dose form *</Label>
                <Input className="h-8 text-sm" value={formData.form} onChange={(e) => updateField("form", e.target.value)} placeholder="tablet, capsule..." />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Interaction</Label>
                <Input className="h-8 text-sm" value={formData.interaction} onChange={(e) => updateField("interaction", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Warning</Label>
                <Input className="h-8 text-sm" value={formData.warning} onChange={(e) => updateField("warning", e.target.value)} />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Pregnancy</Label>
                <Input className="h-8 text-sm" value={formData.pregnancy} onChange={(e) => updateField("pregnancy", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Side effect</Label>
                <Input className="h-8 text-sm" value={formData.sideeffect} onChange={(e) => updateField("sideeffect", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Storage type</Label>
                <Input className="h-8 text-sm" value={formData.storagetype} onChange={(e) => updateField("storagetype", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Description</Label>
                <Input className="h-8 text-sm" value={formData.description} onChange={(e) => updateField("description", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Unit dose / Strength *</Label>
                <Input className="h-8 text-sm" value={formData.strength} onChange={(e) => updateField("strength", e.target.value)} placeholder="500 mg" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Indication</Label>
                <Input className="h-8 text-sm" value={formData.indication} onChange={(e) => updateField("indication", e.target.value)} />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Traffic</Label>
                <Input className="h-8 text-sm" value={formData.traffic} onChange={(e) => updateField("traffic", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Generic name</Label>
                <Input className="h-8 text-sm" value={formData.genericname} onChange={(e) => updateField("genericname", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Manufacturer</Label>
                <Input className="h-8 text-sm" value={formData.manufacturer} onChange={(e) => updateField("manufacturer", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Barcode</Label>
                <Input className="h-8 text-sm" value={formData.barcode} onChange={(e) => updateField("barcode", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">ATC Code</Label>
                <Input className="h-8 text-sm" value={formData.unit} onChange={(e) => updateField("unit", e.target.value)} placeholder="tablet, ml..." />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Notes</Label>
                <Input className="h-8 text-sm" value={formData.notes} onChange={(e) => updateField("notes", e.target.value)} />
              </div>
            </div>

            {/* Insurance approval + actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-600">Is it approved by insurance?</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={formData.insuranceapproved === true}
                    onCheckedChange={() => updateField("insuranceapproved", true)}
                  />
                  <span className="text-sm">Yes</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={formData.insuranceapproved === false}
                    onCheckedChange={() => updateField("insuranceapproved", false)}
                  />
                  <span className="text-sm">No</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !formData.name || !formData.form || !formData.strength}
                >
                  {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Save
                </Button>
              </div>
            </div>

            {saveMutation.isError && (
              <p className="text-sm text-red-500">{(saveMutation.error as Error).message}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Drug</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{drugToDelete?.name}&quot;? This will also remove all associated batches and stock records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => drugToDelete && deleteMutation.mutate(drugToDelete.drugid)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
