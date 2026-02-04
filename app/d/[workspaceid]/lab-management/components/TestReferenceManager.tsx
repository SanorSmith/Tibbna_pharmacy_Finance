"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, Save, X, Search, Eye, Upload } from "lucide-react";
import { LAB_TYPES, getAllTestGroupNames } from "@/lib/test-groups-and-lab-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

interface TestReferenceRange {
  rangeid: string;
  testcode: string;
  testname: string;
  unit: string;
  agegroup: string;
  sex: string;
  referencemin?: string;
  referencemax?: string;
  referencetext?: string;
  paniclow?: string;
  panichigh?: string;
  panictext?: string;
  labtype?: string;
  grouptests?: string;
  sampletype?: string;
  containertype?: string;
  bodysite?: string;
  clinicalindication?: string;
  additionalinformation?: string;
  notes?: string;
  isactive: string;
}

interface TestReferenceManagerProps {
  workspaceid: string;
}

const CATEGORIES = [
  "Hematology",
  "Biochemistry",
  "Microbiology",
  "Immunology",
  "Histopathology",
  "Endocrinology",
];

const AGE_GROUPS = [
  { value: "NEO", label: "Neonatal (0-28 days)" },
  { value: "PED", label: "Pediatric (1 month - 17 years)" },
  { value: "ADULT", label: "Adult (≥18 years)" },
  { value: "ALL", label: "All Ages" },
];

const SEX_OPTIONS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "ANY", label: "Any/Both" },
];

export default function TestReferenceManager({ workspaceid }: TestReferenceManagerProps) {
  const [ranges, setRanges] = useState<TestReferenceRange[]>([]);
  const [filteredRanges, setFilteredRanges] = useState<TestReferenceRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [editingRange, setEditingRange] = useState<TestReferenceRange | null>(null);
  const [deleteRangeId, setDeleteRangeId] = useState<string | null>(null);
  const [viewingRange, setViewingRange] = useState<TestReferenceRange | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string>("");

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [labtypeFilter, setLabtypeFilter] = useState<string>("all");
  const [filterAgeGroup, setFilterAgeGroup] = useState("ALL");

  // Form state
  const [formData, setFormData] = useState({
    testcode: "",
    testname: "",
    unit: "",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: "",
    referencemax: "",
    referencetext: "",
    paniclow: "",
    panichigh: "",
    panictext: "",
    labtype: "",
    grouptests: "",
    sampletype: "",
    containertype: "",
    bodysite: "",
    clinicalindication: "",
    additionalinformation: "",
    notes: "",
  });

  useEffect(() => {
    fetchRanges();
  }, [workspaceid]);

  useEffect(() => {
    applyFilters();
  }, [ranges, searchTerm, labtypeFilter, filterAgeGroup]);

  const fetchRanges = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/d/${workspaceid}/test-reference-ranges`);
      if (response.ok) {
        const data = await response.json();
        setRanges(data.ranges || []);
      }
    } catch (error) {
      console.error("Error fetching reference ranges:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...ranges];

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.testcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.testname.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (labtypeFilter !== "all") {
      filtered = filtered.filter((r) => r.labtype === labtypeFilter);
    }

    if (filterAgeGroup !== "ALL") {
      filtered = filtered.filter((r) => r.agegroup === filterAgeGroup);
    }

    setFilteredRanges(filtered);
  };

  const handleOpenDialog = (range?: TestReferenceRange) => {
    if (range) {
      setEditingRange(range);
      setFormData({
        testcode: range.testcode,
        testname: range.testname,
        unit: range.unit,
        agegroup: range.agegroup,
        sex: range.sex,
        referencemin: range.referencemin || "",
        referencemax: range.referencemax || "",
        referencetext: range.referencetext || "",
        paniclow: range.paniclow || "",
        panichigh: range.panichigh || "",
        panictext: range.panictext || "",
        labtype: range.labtype || "",
        grouptests: range.grouptests || "",
        sampletype: range.sampletype || "",
        containertype: range.containertype || "",
        bodysite: range.bodysite || "",
        clinicalindication: range.clinicalindication || "",
        additionalinformation: range.additionalinformation || "",
        notes: range.notes || "",
      });
    } else {
      setEditingRange(null);
      setFormData({
        testcode: "",
        testname: "",
        unit: "",
        agegroup: "ALL",
        sex: "ANY",
        referencemin: "",
        referencemax: "",
        referencetext: "",
        paniclow: "",
        panichigh: "",
        panictext: "",
        labtype: "",
        grouptests: "",
        sampletype: "",
        containertype: "",
        bodysite: "",
        clinicalindication: "",
        additionalinformation: "",
        notes: "",
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        referencemin: formData.referencemin ? parseFloat(formData.referencemin) : undefined,
        referencemax: formData.referencemax ? parseFloat(formData.referencemax) : undefined,
        paniclow: formData.paniclow ? parseFloat(formData.paniclow) : undefined,
        panichigh: formData.panichigh ? parseFloat(formData.panichigh) : undefined,
      };

      if (editingRange) {
        // Update
        const response = await fetch(`/api/d/${workspaceid}/test-reference-ranges`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rangeid: editingRange.rangeid, ...payload }),
        });

        if (response.ok) {
          await fetchRanges();
          setShowDialog(false);
        }
      } else {
        // Create
        const response = await fetch(`/api/d/${workspaceid}/test-reference-ranges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          await fetchRanges();
          setShowDialog(false);
        }
      }
    } catch (error) {
      console.error("Error saving reference range:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteRangeId) return;

    try {
      const response = await fetch(
        `/api/d/${workspaceid}/test-reference-ranges?rangeid=${deleteRangeId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        await fetchRanges();
        setShowDeleteDialog(false);
        setDeleteRangeId(null);
      }
    } catch (error) {
      console.error("Error deleting reference range:", error);
    }
  };

  const getReferenceDisplay = (range: TestReferenceRange) => {
    if (range.referencetext) return range.referencetext;
    if (range.referencemin && range.referencemax) {
      return `${range.referencemin} - ${range.referencemax}`;
    }
    return "—";
  };

  const getPanicDisplay = (range: TestReferenceRange) => {
    if (range.panictext) return range.panictext;
    const parts = [];
    if (range.paniclow) parts.push(`≤${range.paniclow}`);
    if (range.panichigh) parts.push(`≥${range.panichigh}`);
    return parts.length > 0 ? parts.join(" / ") : "—";
  };

  return (
    <Card className="flex flex-col" style={{ height: 'calc(100vh - 20rem)' }}>
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Test Reference Ranges Management</CardTitle>
            <CardDescription>
              Manage reference ranges, units, and critical values for all laboratory tests
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Test Reference
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {/* Filters */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border space-y-4 flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search" className="text-xs">Search Test</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="labtype" className="text-xs">Lab Type</Label>
              <Select value={labtypeFilter} onValueChange={setLabtypeFilter}>
                <SelectTrigger id="labtype">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lab Types</SelectItem>
                  {LAB_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="agegroup" className="text-xs">Age Group</Label>
              <Select value={filterAgeGroup} onValueChange={setFilterAgeGroup}>
                <SelectTrigger id="agegroup">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Age Groups</SelectItem>
                  {AGE_GROUPS.map((ag) => (
                    <SelectItem key={ag.value} value={ag.value}>
                      {ag.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <Badge variant="outline" className="text-sm">
              {filteredRanges.length} reference range{filteredRanges.length !== 1 ? "s" : ""}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setLabtypeFilter("all");
                setFilterAgeGroup("ALL");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredRanges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No reference ranges found. Click "Add Test Reference" to create one.
          </div>
        ) : (
          <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50 z-10">
                  <TableRow className="text-xs">
                    <TableHead className="font-semibold px-1 py-2 w-14">Code</TableHead>
                    <TableHead className="font-semibold px-1 py-2 w-28">Test Name</TableHead>
                    <TableHead className="font-semibold px-1 py-2 w-16">Lab</TableHead>
                    <TableHead className="font-semibold px-1 py-2 w-20">Group</TableHead>
                    <TableHead className="font-semibold px-1 py-2 w-16">Sample</TableHead>
                    <TableHead className="font-semibold px-1 py-2 w-16">Container</TableHead>
                    <TableHead className="font-semibold px-1 py-2 w-20">Body Site</TableHead>
                    <TableHead className="font-semibold px-1 py-2 w-10 text-center">Age</TableHead>
                    <TableHead className="font-semibold px-1 py-2 w-10 text-center">Sex</TableHead>
                    <TableHead className="font-semibold px-1 py-2 w-12">Unit</TableHead>
                    <TableHead className="font-semibold px-1 py-2 w-24">Reference</TableHead>
                    <TableHead className="font-semibold px-1 py-2 w-16 text-red-600">Panic</TableHead>
                    <TableHead className="font-semibold px-1 py-2 w-28">Clinical</TableHead>
                    <TableHead className="font-semibold px-1 py-2 w-20 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRanges.map((range) => (
                    <TableRow key={range.rangeid} className="hover:bg-gray-50 text-xs">
                      <TableCell className="font-medium px-1 py-1.5">{range.testcode}</TableCell>
                      <TableCell className="font-medium px-1 py-1.5">
                        <div className="truncate max-w-[100px]" title={range.testname}>
                          {range.testname}
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {range.labtype || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        <div className="truncate max-w-[75px]" title={range.grouptests || ""}>
                          {range.grouptests || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        <div className="truncate max-w-[60px]" title={range.sampletype || ""}>
                          {range.sampletype || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        <div className="truncate max-w-[60px]" title={range.containertype || ""}>
                          {range.containertype || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        <div className="truncate max-w-[75px]" title={range.bodysite || ""}>
                          {range.bodysite || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-1.5 text-center">
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          {range.agegroup}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-1 py-1.5 text-center">
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          {range.sex}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono px-1 py-1.5">
                        <div className="truncate max-w-[45px]" title={range.unit}>
                          {range.unit}
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        <div className="truncate max-w-[90px]" title={getReferenceDisplay(range)}>
                          {getReferenceDisplay(range)}
                        </div>
                      </TableCell>
                      <TableCell className="text-red-600 font-medium px-1 py-1.5">
                        <div className="truncate max-w-[60px]" title={getPanicDisplay(range)}>
                          {getPanicDisplay(range)}
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        <div className="truncate max-w-[100px]" title={range.clinicalindication || ""}>
                          {range.clinicalindication || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        <div className="flex gap-0.5 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setViewingRange(range);
                              setShowDetailsDialog(true);
                            }}
                            title="View Details"
                          >
                            <Eye className="h-3 w-3 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleOpenDialog(range)}
                            title="Edit"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setDeleteRangeId(range.rangeid);
                              setShowDeleteDialog(true);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-1">
              <DialogTitle className="text-base">
                {editingRange ? "Edit Test Reference Range" : "Add Test Reference Range"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure reference ranges, units, and critical values for laboratory tests
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-2 py-1">
              {/* Test Information */}
              <div className="col-span-3">
                <h3 className="font-semibold text-xs mb-1">Test Information</h3>
              </div>
              
              <div>
                <Label htmlFor="testcode" className="text-[11px] mb-0.5">Test Code *</Label>
                <Input
                  id="testcode"
                  className="h-7 text-xs"
                  value={formData.testcode}
                  onChange={(e) => setFormData({ ...formData, testcode: e.target.value.toUpperCase() })}
                  placeholder="e.g., HGB, WBC"
                />
              </div>

              <div>
                <Label htmlFor="testname" className="text-[11px] mb-0.5">Test Name *</Label>
                <Input
                  id="testname"
                  className="h-7 text-xs"
                  value={formData.testname}
                  onChange={(e) => setFormData({ ...formData, testname: e.target.value })}
                  placeholder="e.g., Hemoglobin"
                />
              </div>

              <div>
                <Label htmlFor="unit" className="text-[11px] mb-0.5">Unit *</Label>
                <Input
                  id="unit"
                  className="h-7 text-xs"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., g/dL, cells/µL"
                />
              </div>

              {/* Demographics */}
              <div className="col-span-3 mt-1">
                <h3 className="font-semibold text-xs mb-1">Demographics</h3>
              </div>

              <div>
                <Label htmlFor="agegroup" className="text-[11px] mb-0.5">Age Group *</Label>
                <Select
                  value={formData.agegroup}
                  onValueChange={(value) => setFormData({ ...formData, agegroup: value })}
                >
                  <SelectTrigger id="agegroup" className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_GROUPS.map((ag) => (
                      <SelectItem key={ag.value} value={ag.value}>
                        {ag.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sex" className="text-[11px] mb-0.5">Sex *</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(value) => setFormData({ ...formData, sex: value })}
                >
                  <SelectTrigger id="sex" className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEX_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Laboratory & Specimen Information */}
              <div className="col-span-3 mt-1">
                <h3 className="font-semibold text-xs mb-1">Laboratory & Specimen</h3>
              </div>

              <div>
                <Label htmlFor="labtype" className="text-[11px] mb-0.5">Lab Type</Label>
                <Select
                  value={formData.labtype}
                  onValueChange={(value) => setFormData({ ...formData, labtype: value })}
                >
                  <SelectTrigger id="labtype" className="h-7 text-xs">
                    <SelectValue placeholder="Select lab type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LAB_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="grouptests" className="text-[11px] mb-0.5">Group Tests</Label>
                <Select
                  value={formData.grouptests}
                  onValueChange={(value) => setFormData({ ...formData, grouptests: value })}
                >
                  <SelectTrigger id="grouptests" className="h-7 text-xs">
                    <SelectValue placeholder="Select test group" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {getAllTestGroupNames().map((groupName) => (
                      <SelectItem key={groupName} value={groupName}>
                        {groupName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sampletype" className="text-[11px] mb-0.5">Sample Type</Label>
                <Input
                  id="sampletype"
                  className="h-7 text-xs"
                  value={formData.sampletype}
                  onChange={(e) => setFormData({ ...formData, sampletype: e.target.value })}
                  placeholder="e.g., Blood, Serum, Urine"
                />
              </div>

              <div>
                <Label htmlFor="containertype" className="text-[11px] mb-0.5">Container</Label>
                <Input
                  id="containertype"
                  className="h-7 text-xs"
                  value={formData.containertype}
                  onChange={(e) => setFormData({ ...formData, containertype: e.target.value })}
                  placeholder="e.g., EDTA tube (purple top), SST tube"
                />
              </div>

              <div>
                <Label htmlFor="bodysite" className="text-[11px] mb-0.5">Body Site</Label>
                <Input
                  id="bodysite"
                  className="h-7 text-xs"
                  value={formData.bodysite}
                  onChange={(e) => setFormData({ ...formData, bodysite: e.target.value })}
                  placeholder="e.g., Venous blood, Midstream urine"
                />
              </div>

              {/* Reference Range */}
              <div className="col-span-3 mt-1">
                <h3 className="font-semibold text-xs mb-1">Reference Range</h3>
              </div>

              <div>
                <Label htmlFor="referencemin" className="text-[11px] mb-0.5">Ref Min</Label>
                <Input
                  id="referencemin"
                  className="h-7 text-xs"
                  type="number"
                  step="any"
                  value={formData.referencemin}
                  onChange={(e) => setFormData({ ...formData, referencemin: e.target.value })}
                  placeholder="e.g., 13.0"
                />
              </div>

              <div>
                <Label htmlFor="referencemax" className="text-[11px] mb-0.5">Ref Max</Label>
                <Input
                  id="referencemax"
                  className="h-7 text-xs"
                  type="number"
                  step="any"
                  value={formData.referencemax}
                  onChange={(e) => setFormData({ ...formData, referencemax: e.target.value })}
                  placeholder="e.g., 17.0"
                />
              </div>

              <div>
                <Label htmlFor="referencetext" className="text-[11px] mb-0.5">Ref Text</Label>
                <Input
                  id="referencetext"
                  className="h-7 text-xs"
                  value={formData.referencetext}
                  onChange={(e) => setFormData({ ...formData, referencetext: e.target.value })}
                  placeholder="e.g., Negative, Absent, Non-reactive"
                />
              </div>

              {/* Panic/Critical Values */}
              <div className="col-span-3 mt-1">
                <h3 className="font-semibold text-xs mb-1">Panic/Critical Values</h3>
              </div>

              <div>
                <Label htmlFor="paniclow" className="text-[11px] mb-0.5">Panic Low</Label>
                <Input
                  id="paniclow"
                  className="h-7 text-xs"
                  type="number"
                  step="any"
                  value={formData.paniclow}
                  onChange={(e) => setFormData({ ...formData, paniclow: e.target.value })}
                  placeholder="e.g., 7"
                />
              </div>

              <div>
                <Label htmlFor="panichigh" className="text-[11px] mb-0.5">Panic High</Label>
                <Input
                  id="panichigh"
                  className="h-7 text-xs"
                  type="number"
                  step="any"
                  value={formData.panichigh}
                  onChange={(e) => setFormData({ ...formData, panichigh: e.target.value })}
                  placeholder="e.g., 20"
                />
              </div>

              <div>
                <Label htmlFor="panictext" className="text-[11px] mb-0.5">Panic Text</Label>
                <Input
                  id="panictext"
                  className="h-7 text-xs"
                  value={formData.panictext}
                  onChange={(e) => setFormData({ ...formData, panictext: e.target.value })}
                  placeholder="e.g., Positive, Present, Reactive"
                />
              </div>

              {/* Clinical Information */}
              <div className="col-span-3 mt-1">
                <h3 className="font-semibold text-xs mb-1">Clinical Information</h3>
              </div>

              <div className="col-span-3">
                <Label htmlFor="clinicalindication" className="text-[11px] mb-0.5">Clinical Indication</Label>
                <Textarea
                  id="clinicalindication"
                  className="text-xs min-h-0 py-1"
                  value={formData.clinicalindication}
                  onChange={(e) => setFormData({ ...formData, clinicalindication: e.target.value })}
                  placeholder="e.g., Screening for anemia, Diabetes monitoring"
                  rows={1}
                />
              </div>

              <div className="col-span-3">
                <Label htmlFor="additionalinformation" className="text-[11px] mb-0.5">Additional Info</Label>
                <Textarea
                  id="additionalinformation"
                  className="text-xs min-h-0 py-1"
                  value={formData.additionalinformation}
                  onChange={(e) => setFormData({ ...formData, additionalinformation: e.target.value })}
                  placeholder="e.g., Special handling requirements"
                  rows={1}
                />
              </div>

            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
              <Button onClick={handleSave} className="h-7 text-xs">
                <Save className="h-3 w-3 mr-1" />
                {editingRange ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details View Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-1">
              <DialogTitle className="text-base">Test Reference Details</DialogTitle>
              <DialogDescription className="text-xs">
                Complete information for {viewingRange?.testcode} - {viewingRange?.testname}
              </DialogDescription>
            </DialogHeader>

            {viewingRange && (
              <div className="space-y-3 py-2">
                {/* Test Information */}
                <div>
                  <h3 className="font-semibold text-xs mb-1 text-gray-700 border-b pb-0.5">Test Information</h3>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Test Code:</span>
                      <p className="mt-0.5">{viewingRange.testcode}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Test Name:</span>
                      <p className="mt-0.5">{viewingRange.testname}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Unit:</span>
                      <p className="mt-0.5 font-mono">{viewingRange.unit || "—"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Lab Type:</span>
                      <p className="mt-0.5">
                        <Badge variant="outline" className="text-[10px] h-4 px-1">{viewingRange.labtype || "—"}</Badge>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Demographics */}
                <div>
                  <h3 className="font-semibold text-xs mb-1 text-gray-700 border-b pb-0.5">Demographics</h3>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Age Group:</span>
                      <p className="mt-0.5">
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {AGE_GROUPS.find(ag => ag.value === viewingRange.agegroup)?.label || viewingRange.agegroup}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Sex:</span>
                      <p className="mt-0.5">
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {SEX_OPTIONS.find(s => s.value === viewingRange.sex)?.label || viewingRange.sex}
                        </Badge>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Laboratory & Specimen Information */}
                <div>
                  <h3 className="font-semibold text-xs mb-1 text-gray-700 border-b pb-0.5">Laboratory & Specimen</h3>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Group Tests:</span>
                      <p className="mt-0.5">{viewingRange.grouptests || "—"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Sample Type:</span>
                      <p className="mt-0.5">{viewingRange.sampletype || "—"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Container:</span>
                      <p className="mt-0.5">{viewingRange.containertype || "—"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Body Site:</span>
                      <p className="mt-0.5">{viewingRange.bodysite || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Reference Range */}
                <div>
                  <h3 className="font-semibold text-xs mb-1 text-gray-700 border-b pb-0.5">Reference Range</h3>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Ref Min:</span>
                      <p className="mt-0.5 font-mono">{viewingRange.referencemin || "—"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Ref Max:</span>
                      <p className="mt-0.5 font-mono">{viewingRange.referencemax || "—"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Ref Text:</span>
                      <p className="mt-0.5">{viewingRange.referencetext || "—"}</p>
                    </div>
                    <div className="col-span-3">
                      <span className="font-medium text-gray-600 text-[10px]">Full Display:</span>
                      <p className="mt-0.5 font-medium text-blue-600">{getReferenceDisplay(viewingRange)}</p>
                    </div>
                  </div>
                </div>

                {/* Panic/Critical Values */}
                <div>
                  <h3 className="font-semibold text-xs mb-1 text-red-700 border-b border-red-200 pb-0.5">Panic/Critical Values</h3>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Panic Low:</span>
                      <p className="mt-0.5 font-mono text-red-600">{viewingRange.paniclow || "—"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Panic High:</span>
                      <p className="mt-0.5 font-mono text-red-600">{viewingRange.panichigh || "—"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Panic Text:</span>
                      <p className="mt-0.5 text-red-600">{viewingRange.panictext || "—"}</p>
                    </div>
                    <div className="col-span-3">
                      <span className="font-medium text-gray-600 text-[10px]">Full Display:</span>
                      <p className="mt-0.5 font-medium text-red-600">{getPanicDisplay(viewingRange)}</p>
                    </div>
                  </div>
                </div>

                {/* Clinical Information */}
                <div>
                  <h3 className="font-semibold text-xs mb-1 text-gray-700 border-b pb-0.5">Clinical Information</h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Clinical Indication:</span>
                      <p className="mt-0.5 text-gray-800 leading-snug">
                        {viewingRange.clinicalindication || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 text-[10px]">Additional Info:</span>
                      <p className="mt-0.5 text-gray-800 leading-snug">
                        {viewingRange.additionalinformation || "—"}
                      </p>
                    </div>
                    {viewingRange.notes && (
                      <div>
                        <span className="font-medium text-gray-600 text-[10px]">Notes:</span>
                        <p className="mt-0.5 text-gray-800 leading-snug">{viewingRange.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)} className="h-7 text-xs">
                Close
              </Button>
              <Button onClick={() => {
                setShowDetailsDialog(false);
                handleOpenDialog(viewingRange!);
              }} className="h-7 text-xs">
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Reference Range?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the reference range. It will no longer be used for test result validation.
                This action can be reversed by editing the range and reactivating it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
