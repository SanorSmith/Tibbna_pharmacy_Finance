"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Plus,
  Pencil,
  Loader2,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
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

interface FormData {
  name: string;
  genericname: string;
  nationalcode: string;
  category: string | undefined;
  form: string | undefined;
  strength: string | undefined;
  unit: string;
  barcode: string;
  manufacturer: string;
  atccode: string;
  interaction: string;
  warning: string;
  pregnancy: string | undefined;
  sideeffect: string;
  storagetype: string | undefined;
  description: string;
  indication: string;
  traffic: string | undefined;
  notes: string;
  insuranceapproved: boolean;
  requiresprescription: boolean;
}

const emptyForm: FormData = {
  name: "",
  genericname: "",
  nationalcode: "",
  category: undefined,
  form: undefined,
  strength: undefined,
  unit: "tablet",
  barcode: "",
  manufacturer: "",
  atccode: "",
  interaction: "",
  warning: "",
  pregnancy: undefined,
  sideeffect: "",
  storagetype: undefined,
  description: "",
  indication: "",
  traffic: undefined,
  notes: "",
  insuranceapproved: false,
  requiresprescription: true,
};

export default function DrugRegistration({ workspaceid }: { workspaceid: string }) {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDrug, setEditingDrug] = useState<DrugRecord | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [drugToDelete, setDrugToDelete] = useState<DrugRecord | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ drugs: DrugRecord[] }>({
    queryKey: ["pharmacy-drugs", workspaceid, search],
    queryFn: async () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-drugs${qs}`);
      if (!res.ok) throw new Error("Failed to fetch drugs");
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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
      setShowAddForm(false);
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
    setShowAddForm(true);
    setDialogOpen(false);
  };

  const handleOpenEdit = (drug: DrugRecord) => {
    setEditingDrug(drug);
    setFormData({
      name: drug.name,
      genericname: drug.genericname || "",
      nationalcode: drug.nationalcode || "",
      category: drug.category || undefined,
      form: (drug.form && drug.form.trim()) ? drug.form : undefined,
      strength: drug.strength || undefined,
      unit: drug.unit,
      barcode: drug.barcode || "",
      manufacturer: drug.manufacturer || "",
      atccode: drug.atccode || "",
      interaction: drug.interaction || "",
      warning: drug.warning || "",
      pregnancy: drug.pregnancy || undefined,
      sideeffect: drug.sideeffect || "",
      storagetype: drug.storagetype || undefined,
      description: drug.description || "",
      indication: drug.indication || "",
      traffic: drug.traffic || undefined,
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

  const renderDrugFormContent = (onCancel: () => void) => (
    <div className="space-y-4">
      {/* Row 1: Drug name → Form → Strength → National code → Category */}
      <div className="grid grid-cols-6 gap-3">
        <div className="space-y-1 col-span-2">
          <Label className="text-[11px]">Drug name *</Label>
          <Input className="h-8 text-sm" value={formData.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. Acrecil" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Dose form *</Label>
          <Select value={formData.form || undefined} onValueChange={(value) => updateField("form", value)}>
            <SelectTrigger className="h-8 text-sm min-w-[120px]"><SelectValue placeholder="Select form" /></SelectTrigger>
            <SelectContent>
              {["tablet","capsule","syrup","injection","cream","ointment","drops","inhaler","patch","suppository","powder","solution","suspension","gel","lotion","spray"].map(f => (
                <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Strength *</Label>
          <Select value={formData.strength || undefined} onValueChange={(value) => updateField("strength", value)}>
            <SelectTrigger className="h-8 text-sm min-w-[120px]"><SelectValue placeholder="Select strength" /></SelectTrigger>
            <SelectContent>
              {["1 mg","2.5 mg","5 mg","10 mg","20 mg","25 mg","50 mg","100 mg","125 mg","150 mg","200 mg","250 mg","300 mg","400 mg","500 mg","600 mg","750 mg","800 mg","1000 mg","1 g","2 g","5 mcg","10 mcg","25 mcg","50 mcg","100 mcg","200 mcg","500 mcg","1000 mcg","1 mg/ml","5 mg/ml","10 mg/ml","50 mg/ml","100 mg/ml","100 IU","1000 IU","5000 IU","10000 IU"].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">National code</Label>
          <Input className="h-8 text-sm" value={formData.nationalcode} onChange={(e) => updateField("nationalcode", e.target.value)} placeholder="e.g. NDL123456" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Category</Label>
          <Select value={formData.category || undefined} onValueChange={(value) => updateField("category", value)}>
            <SelectTrigger className="h-8 text-sm min-w-[120px]"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {["antibiotic","analgesic","antipyretic","anti-inflammatory","antihistamine","antiviral","antifungal","cardiovascular","diuretic","antihypertensive","antidiabetic","vitamin","supplement","vaccine","anesthetic","muscle relaxant","antidepressant","antipsychotic","bronchodilator","corticosteroid","hormone","contraceptive"].map(c => (
                <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Row 2: Side effect, Storage type, Pregnancy, Traffic, Indication */}
      <div className="grid grid-cols-6 gap-3">
        <div className="space-y-1 col-span-2">
          <Label className="text-[11px]">Side effect</Label>
          <Input className="h-8 text-sm" value={formData.sideeffect} onChange={(e) => updateField("sideeffect", e.target.value)} placeholder="e.g. Drowsiness, Nausea" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Storage type</Label>
          <Select value={formData.storagetype || undefined} onValueChange={(value) => updateField("storagetype", value)}>
            <SelectTrigger className="h-8 text-sm min-w-[120px]"><SelectValue placeholder="Select storage type" /></SelectTrigger>
            <SelectContent>
              {["Room temperature","Refrigerated","Frozen","Cool dry place","Dark place","Away from light","Controlled temperature","Dry place","Airtight container","Child-proof container","Original container"].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Pregnancy</Label>
          <Select value={formData.pregnancy || undefined} onValueChange={(value) => updateField("pregnancy", value)}>
            <SelectTrigger className="h-8 text-sm min-w-[120px]"><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Traffic</Label>
          <Select value={formData.traffic || undefined} onValueChange={(value) => updateField("traffic", value)}>
            <SelectTrigger className="h-8 text-sm min-w-[120px]"><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Indication</Label>
          <Input className="h-8 text-sm" value={formData.indication} onChange={(e) => updateField("indication", e.target.value)} placeholder="e.g. Hypertension, Pain relief" />
        </div>
      </div>
      {/* Row 3 */}
      <div className="grid grid-cols-6 gap-3">
        <div className="space-y-1 col-span-2">
          <Label className="text-[11px]">Generic name</Label>
          <Input className="h-8 text-sm" value={formData.genericname} onChange={(e) => updateField("genericname", e.target.value)} placeholder="e.g. Acetaminophen" />
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-[11px]">Manufacturer</Label>
          <Input className="h-8 text-sm" value={formData.manufacturer} onChange={(e) => updateField("manufacturer", e.target.value)} placeholder="e.g. Pfizer, GSK" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Barcode</Label>
          <Input className="h-8 text-sm" value={formData.barcode} onChange={(e) => updateField("barcode", e.target.value)} placeholder="e.g. 1234567890123" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">ATC Code</Label>
          <Input className="h-8 text-sm" value={formData.atccode} onChange={(e) => updateField("atccode", e.target.value)} placeholder="e.g. J01CA04" />
        </div>
      </div>
      {/* Textarea Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px]">Description</Label>
          <Textarea className="text-sm overflow-y-auto resize-none h-[72px]" value={formData.description} onChange={(e) => updateField("description", e.target.value)} rows={3} placeholder="Enter drug description" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Interaction</Label>
          <Textarea className="text-sm overflow-y-auto resize-none h-[72px]" value={formData.interaction} onChange={(e) => updateField("interaction", e.target.value)} rows={3} placeholder="Enter drug interactions" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Warning</Label>
          <Textarea className="text-sm overflow-y-auto resize-none h-[72px]" value={formData.warning} onChange={(e) => updateField("warning", e.target.value)} rows={3} placeholder="Enter drug warnings" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Notes</Label>
          <Textarea className="text-sm overflow-y-auto resize-none h-[72px]" value={formData.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} placeholder="Enter additional notes" />
        </div>
      </div>
      {/* Insurance + actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-blue-600">Insurance approved?</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox checked={formData.insuranceapproved === true} onCheckedChange={() => updateField("insuranceapproved", true)} />
            <span className="text-sm">Yes</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox checked={formData.insuranceapproved === false} onCheckedChange={() => updateField("insuranceapproved", false)} />
            <span className="text-sm">No</span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saveMutation.isPending}>Cancel</Button>
          <Button
            size="sm"
            className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
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
  );

  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  const drugList = data?.drugs || [];
  const totalPages = Math.ceil(drugList.length / PAGE_SIZE);
  const paginatedDrugs = drugList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Add New Drug form — inline at top */}
      {showAddForm && (
        <Card className="shadow-sm border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-blue-700">New Drug Registration</h3>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => { setShowAddForm(false); setFormData(emptyForm); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {renderDrugFormContent(() => { setShowAddForm(false); setFormData(emptyForm); })}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Drug Registration</h2>
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search with product Drug or name"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
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
              className="h-8 bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900 text-xs"
              onClick={handleOpenNew}
            >
              <Plus className="h-3 w-3 mr-1" />
              New registration
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#618FF5]" />
            </div>
          ) : drugList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No drugs registered. Click &quot;New registration&quot; to add one.
            </p>
          ) : (
            <TooltipProvider>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#618FF5]/10">
                      <TableHead className="text-[10px] font-semibold w-8 py-1.5 px-2">#</TableHead>
                      <TableHead className="text-[10px] font-semibold min-w-[50px] max-w-[70px] py-1.5 px-2">Drug Name</TableHead>
                      <TableHead className="text-[10px] font-semibold w-20 py-1.5 px-2">NDL Code</TableHead>
                      <TableHead className="text-[10px] font-semibold w-16 py-1.5 px-2">ATC</TableHead>
                      <TableHead className="text-[10px] font-semibold w-24 py-1.5 px-2">Category</TableHead>
                      <TableHead className="text-[10px] font-semibold w-16 py-1.5 px-2">Form</TableHead>
                      <TableHead className="text-[10px] font-semibold w-20 py-1.5 px-2">Strength</TableHead>
                      <TableHead className="text-[10px] font-semibold w-14 py-1.5 px-2 text-center">Ins.</TableHead>
                      <TableHead className="text-[10px] font-semibold text-center w-14 py-1.5 px-2">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDrugs.map((drug, idx) => (
                      <TableRow key={drug.drugid} className="hover:bg-gray-50">
                        <TableCell className="text-[11px] text-blue-600 font-medium py-1.5 px-2">{(currentPage - 1) * PAGE_SIZE + idx + 1}</TableCell>
                        <TableCell className="min-w-[50px] max-w-[70px] py-1.5 px-2">
                          {drug.name.length > 15 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-[12px] font-medium truncate cursor-help">
                                  {drug.name}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md">
                                <p className="text-xs">{drug.name}</p>
                                {drug.genericname && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Generic: {drug.genericname}
                                  </p>
                                )}
                                {drug.atccode && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    ATC: {drug.atccode}
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className="text-[12px] font-medium">{drug.name}</div>
                          )}
                          {drug.genericname && drug.genericname !== drug.name && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              {drug.genericname}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-[10px] py-1.5 px-2">{drug.nationalcode || "—"}</TableCell>
                        <TableCell className="text-[10px] py-1.5 px-2 font-mono">{drug.atccode || "—"}</TableCell>
                        <TableCell className="text-[10px] truncate py-1.5 px-2" title={drug.category || ""}>
                          {drug.category || "—"}
                        </TableCell>
                        <TableCell className="text-[10px] py-1.5 px-2">{drug.form}</TableCell>
                        <TableCell className="text-[10px] py-1.5 px-2">{drug.strength}</TableCell>
                        <TableCell className="py-1.5 px-2 text-center">
                          {drug.insuranceapproved ? (
                            <Badge className="text-[9px] px-1 py-0 bg-green-500">Y</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">N</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-1.5 px-1">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-[#618FF5] hover:text-[#4a6fd4] hover:bg-blue-50"
                              onClick={() => handleOpenEdit(drug)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => { setDrugToDelete(drug); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, drugList.length)} of {drugList.length} drugs
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce<(number | "...")[]>((acc, p, i, arr) => {
                        if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "..." ? (
                          <span key={`ellipsis-${i}`} className="text-xs px-1 text-muted-foreground">…</span>
                        ) : (
                          <Button
                            key={p}
                            variant={currentPage === p ? "default" : "outline"}
                            size="sm"
                            className={`h-7 w-7 p-0 text-xs ${
                              currentPage === p ? "bg-[#618FF5] text-white hover:bg-[#618FF5]" : ""
                            }`}
                            onClick={() => setCurrentPage(p as number)}
                          >
                            {p}
                          </Button>
                        )
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog — only for editing existing drugs */}
      <Dialog open={dialogOpen && !!editingDrug} onOpenChange={(open) => {
          if (!open) { setDialogOpen(false); setEditingDrug(null); setFormData(emptyForm); }
        }}>
        <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Drug</DialogTitle>
          </DialogHeader>
          {renderDrugFormContent(() => { setDialogOpen(false); setEditingDrug(null); setFormData(emptyForm); })}
        </DialogContent>
      </Dialog>

      {/* LEGACY FORM CONTENT - kept for reference, replaced by renderDrugFormContent above */}
      {false && <div className="space-y-4">
            {/* Row 1: Drug name → Form → Strength → National code → Category → Generic name */}
            <div className="grid grid-cols-6 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-[11px]">Drug name *</Label>
                <Input className="h-8 text-sm" value={formData.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. Acrecil" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Dose form *</Label>
                <Select value={formData.form || undefined} onValueChange={(value) => updateField("form", value)}>
                  <SelectTrigger className="h-8 text-sm min-w-[120px]">
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="capsule">Capsule</SelectItem>
                    <SelectItem value="syrup">Syrup</SelectItem>
                    <SelectItem value="injection">Injection</SelectItem>
                    <SelectItem value="cream">Cream</SelectItem>
                    <SelectItem value="ointment">Ointment</SelectItem>
                    <SelectItem value="drops">Drops</SelectItem>
                    <SelectItem value="inhaler">Inhaler</SelectItem>
                    <SelectItem value="patch">Patch</SelectItem>
                    <SelectItem value="suppository">Suppository</SelectItem>
                    <SelectItem value="powder">Powder</SelectItem>
                    <SelectItem value="solution">Solution</SelectItem>
                    <SelectItem value="suspension">Suspension</SelectItem>
                    <SelectItem value="gel">Gel</SelectItem>
                    <SelectItem value="lotion">Lotion</SelectItem>
                    <SelectItem value="spray">Spray</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Strength *</Label>
                <Select value={formData.strength || undefined} onValueChange={(value) => updateField("strength", value)}>
                  <SelectTrigger className="h-8 text-sm min-w-[120px]">
                    <SelectValue placeholder="Select strength" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 mg">1 mg</SelectItem>
                    <SelectItem value="2.5 mg">2.5 mg</SelectItem>
                    <SelectItem value="5 mg">5 mg</SelectItem>
                    <SelectItem value="10 mg">10 mg</SelectItem>
                    <SelectItem value="20 mg">20 mg</SelectItem>
                    <SelectItem value="25 mg">25 mg</SelectItem>
                    <SelectItem value="50 mg">50 mg</SelectItem>
                    <SelectItem value="100 mg">100 mg</SelectItem>
                    <SelectItem value="125 mg">125 mg</SelectItem>
                    <SelectItem value="150 mg">150 mg</SelectItem>
                    <SelectItem value="200 mg">200 mg</SelectItem>
                    <SelectItem value="250 mg">250 mg</SelectItem>
                    <SelectItem value="300 mg">300 mg</SelectItem>
                    <SelectItem value="400 mg">400 mg</SelectItem>
                    <SelectItem value="500 mg">500 mg</SelectItem>
                    <SelectItem value="600 mg">600 mg</SelectItem>
                    <SelectItem value="750 mg">750 mg</SelectItem>
                    <SelectItem value="800 mg">800 mg</SelectItem>
                    <SelectItem value="1000 mg">1000 mg</SelectItem>
                    <SelectItem value="1 g">1 g</SelectItem>
                    <SelectItem value="2 g">2 g</SelectItem>
                    <SelectItem value="5 mcg">5 mcg</SelectItem>
                    <SelectItem value="10 mcg">10 mcg</SelectItem>
                    <SelectItem value="25 mcg">25 mcg</SelectItem>
                    <SelectItem value="50 mcg">50 mcg</SelectItem>
                    <SelectItem value="100 mcg">100 mcg</SelectItem>
                    <SelectItem value="200 mcg">200 mcg</SelectItem>
                    <SelectItem value="500 mcg">500 mcg</SelectItem>
                    <SelectItem value="1000 mcg">1000 mcg</SelectItem>
                    <SelectItem value="1 mg/ml">1 mg/ml</SelectItem>
                    <SelectItem value="5 mg/ml">5 mg/ml</SelectItem>
                    <SelectItem value="10 mg/ml">10 mg/ml</SelectItem>
                    <SelectItem value="50 mg/ml">50 mg/ml</SelectItem>
                    <SelectItem value="100 mg/ml">100 mg/ml</SelectItem>
                    <SelectItem value="100 IU">100 IU</SelectItem>
                    <SelectItem value="1000 IU">1000 IU</SelectItem>
                    <SelectItem value="5000 IU">5000 IU</SelectItem>
                    <SelectItem value="10000 IU">10000 IU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">National code</Label>
                <Input className="h-8 text-sm" value={formData.nationalcode} onChange={(e) => updateField("nationalcode", e.target.value)} placeholder="e.g. NDL123456" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Category</Label>
                <Select value={formData.category || undefined} onValueChange={(value) => updateField("category", value)}>
                  <SelectTrigger className="h-8 text-sm min-w-[120px]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="antibiotic">Antibiotic</SelectItem>
                    <SelectItem value="analgesic">Analgesic</SelectItem>
                    <SelectItem value="antipyretic">Antipyretic</SelectItem>
                    <SelectItem value="anti-inflammatory">Anti-inflammatory</SelectItem>
                    <SelectItem value="antihistamine">Antihistamine</SelectItem>
                    <SelectItem value="antiviral">Antiviral</SelectItem>
                    <SelectItem value="antifungal">Antifungal</SelectItem>
                    <SelectItem value="cardiovascular">Cardiovascular</SelectItem>
                    <SelectItem value="diuretic">Diuretic</SelectItem>
                    <SelectItem value="antihypertensive">Antihypertensive</SelectItem>
                    <SelectItem value="antidiabetic">Antidiabetic</SelectItem>
                    <SelectItem value="vitamin">Vitamin</SelectItem>
                    <SelectItem value="supplement">Supplement</SelectItem>
                    <SelectItem value="vaccine">Vaccine</SelectItem>
                    <SelectItem value="anesthetic">Anesthetic</SelectItem>
                    <SelectItem value="muscle relaxant">Muscle Relaxant</SelectItem>
                    <SelectItem value="antidepressant">Antidepressant</SelectItem>
                    <SelectItem value="antipsychotic">Antipsychotic</SelectItem>
                    <SelectItem value="bronchodilator">Bronchodilator</SelectItem>
                    <SelectItem value="corticosteroid">Corticosteroid</SelectItem>
                    <SelectItem value="hormone">Hormone</SelectItem>
                    <SelectItem value="contraceptive">Contraceptive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Side effect, Storage type, Pregnancy, Traffic, Indication */}
            <div className="grid grid-cols-6 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-[11px]">Side effect</Label>
                <Input className="h-8 text-sm" value={formData.sideeffect} onChange={(e) => updateField("sideeffect", e.target.value)} placeholder="e.g. Drowsiness, Nausea" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Storage type</Label>
                <Select value={formData.storagetype || undefined} onValueChange={(value) => updateField("storagetype", value)}>
                  <SelectTrigger className="h-8 text-sm min-w-[120px]">
                    <SelectValue placeholder="Select storage type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Room temperature">Room temperature</SelectItem>
                    <SelectItem value="Refrigerated">Refrigerated</SelectItem>
                    <SelectItem value="Frozen">Frozen</SelectItem>
                    <SelectItem value="Cool dry place">Cool dry place</SelectItem>
                    <SelectItem value="Dark place">Dark place</SelectItem>
                    <SelectItem value="Away from light">Away from light</SelectItem>
                    <SelectItem value="Controlled temperature">Controlled temperature</SelectItem>
                    <SelectItem value="Dry place">Dry place</SelectItem>
                    <SelectItem value="Airtight container">Airtight container</SelectItem>
                    <SelectItem value="Child-proof container">Child-proof container</SelectItem>
                    <SelectItem value="Original container">Original container</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Pregnancy</Label>
                <Select value={formData.pregnancy || undefined} onValueChange={(value) => updateField("pregnancy", value)}>
                  <SelectTrigger className="h-8 text-sm min-w-[120px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Traffic</Label>
                <Select value={formData.traffic || undefined} onValueChange={(value) => updateField("traffic", value)}>
                  <SelectTrigger className="h-8 text-sm min-w-[120px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Indication</Label>
                <Input className="h-8 text-sm" value={formData.indication} onChange={(e) => updateField("indication", e.target.value)} placeholder="e.g. Hypertension, Pain relief" />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-6 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-[11px]">Generic name</Label>
                <Input className="h-8 text-sm" value={formData.genericname} onChange={(e) => updateField("genericname", e.target.value)} placeholder="e.g. Acetaminophen" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-[11px]">Manufacturer</Label>
                <Input className="h-8 text-sm" value={formData.manufacturer} onChange={(e) => updateField("manufacturer", e.target.value)} placeholder="e.g. Pfizer, GSK" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Barcode</Label>
                <Input className="h-8 text-sm" value={formData.barcode} onChange={(e) => updateField("barcode", e.target.value)} placeholder="e.g. 1234567890123" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">ATC Code</Label>
                <Input className="h-8 text-sm" value={formData.atccode} onChange={(e) => updateField("atccode", e.target.value)} placeholder="e.g. J01CA04" />
              </div>
                          </div>

            {/* Textarea Fields Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Description</Label>
                <Textarea className="text-sm overflow-y-auto resize-none h-[72px]" value={formData.description} onChange={(e) => updateField("description", e.target.value)} rows={3} placeholder="Enter drug description" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Interaction</Label>
                <Textarea className="text-sm overflow-y-auto resize-none h-[72px]" value={formData.interaction} onChange={(e) => updateField("interaction", e.target.value)} rows={3} placeholder="Enter drug interactions" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Warning</Label>
                <Textarea className="text-sm overflow-y-auto resize-none h-[72px]" value={formData.warning} onChange={(e) => updateField("warning", e.target.value)} rows={3} placeholder="Enter drug warnings" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Notes</Label>
                <Textarea className="text-sm overflow-y-auto resize-none h-[72px]" value={formData.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} placeholder="Enter additional notes" />
              </div>
            </div>

            {/* Insurance approval + actions */}
            <div className="flex items-center justify-between pt-6 border-t">
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
                  className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
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
          </div>}
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
