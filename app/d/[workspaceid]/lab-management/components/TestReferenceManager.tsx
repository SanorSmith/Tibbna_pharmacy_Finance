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
import { Plus, Edit2, Trash2, Save, X, Search } from "lucide-react";
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
  category: string;
  unit: string;
  agegroup: string;
  sex: string;
  referencemin?: string;
  referencemax?: string;
  referencetext?: string;
  paniclow?: string;
  panichigh?: string;
  panictext?: string;
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
  const [editingRange, setEditingRange] = useState<TestReferenceRange | null>(null);
  const [deleteRangeId, setDeleteRangeId] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterAgeGroup, setFilterAgeGroup] = useState("ALL");

  // Form state
  const [formData, setFormData] = useState({
    testcode: "",
    testname: "",
    category: "Hematology",
    unit: "",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: "",
    referencemax: "",
    referencetext: "",
    paniclow: "",
    panichigh: "",
    panictext: "",
    notes: "",
  });

  useEffect(() => {
    fetchRanges();
  }, [workspaceid]);

  useEffect(() => {
    applyFilters();
  }, [ranges, searchTerm, filterCategory, filterAgeGroup]);

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

    if (filterCategory !== "ALL") {
      filtered = filtered.filter((r) => r.category === filterCategory);
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
        category: range.category,
        unit: range.unit,
        agegroup: range.agegroup,
        sex: range.sex,
        referencemin: range.referencemin || "",
        referencemax: range.referencemax || "",
        referencetext: range.referencetext || "",
        paniclow: range.paniclow || "",
        panichigh: range.panichigh || "",
        panictext: range.panictext || "",
        notes: range.notes || "",
      });
    } else {
      setEditingRange(null);
      setFormData({
        testcode: "",
        testname: "",
        category: "Hematology",
        unit: "",
        agegroup: "ALL",
        sex: "ANY",
        referencemin: "",
        referencemax: "",
        referencetext: "",
        paniclow: "",
        panichigh: "",
        panictext: "",
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
    <Card>
      <CardHeader>
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
      <CardContent>
        {/* Filters */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border space-y-4">
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
              <Label htmlFor="category" className="text-xs">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
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
                setFilterCategory("ALL");
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
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-y-auto max-h-96">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50 z-10">
                  <TableRow>
                    <TableHead className="font-semibold w-16">Code</TableHead>
                    <TableHead className="font-semibold w-40">Test Name</TableHead>
                    <TableHead className="font-semibold w-20">Category</TableHead>
                    <TableHead className="font-semibold w-12">Age</TableHead>
                    <TableHead className="font-semibold w-12">Sex</TableHead>
                    <TableHead className="font-semibold w-16">Unit</TableHead>
                    <TableHead className="font-semibold w-32">Reference</TableHead>
                    <TableHead className="font-semibold w-28 text-red-600">Panic</TableHead>
                    <TableHead className="font-semibold w-28 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRanges.map((range) => (
                    <TableRow key={range.rangeid} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-sm">{range.testcode}</TableCell>
                      <TableCell className="text-sm font-medium">{range.testname}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {range.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {range.agegroup}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs w-8 justify-center">
                          {range.sex}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{range.unit}</TableCell>
                      <TableCell className="text-sm">
                        <div className="max-w-xs truncate" title={getReferenceDisplay(range)}>
                          {getReferenceDisplay(range)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-red-600 font-medium">
                        <div className="max-w-xs truncate" title={getPanicDisplay(range)}>
                          {getPanicDisplay(range)}
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleOpenDialog(range)}
                            title="Edit"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
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
          <DialogContent className="max-w-[65vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRange ? "Edit Test Reference Range" : "Add Test Reference Range"}
              </DialogTitle>
              <DialogDescription>
                Configure reference ranges, units, and critical values for laboratory tests
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              {/* Test Information */}
              <div className="col-span-2">
                <h3 className="font-semibold mb-3">Test Information</h3>
              </div>
              
              <div>
                <Label htmlFor="testcode">Test Code *</Label>
                <Input
                  id="testcode"
                  value={formData.testcode}
                  onChange={(e) => setFormData({ ...formData, testcode: e.target.value.toUpperCase() })}
                  placeholder="e.g., HGB, WBC"
                />
              </div>

              <div>
                <Label htmlFor="testname">Test Name *</Label>
                <Input
                  id="testname"
                  value={formData.testname}
                  onChange={(e) => setFormData({ ...formData, testname: e.target.value })}
                  placeholder="e.g., Hemoglobin"
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="unit">Unit *</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., g/dL, cells/µL"
                />
              </div>

              {/* Demographics */}
              <div className="col-span-2 mt-4">
                <h3 className="font-semibold mb-3">Demographics</h3>
              </div>

              <div>
                <Label htmlFor="agegroup">Age Group *</Label>
                <Select
                  value={formData.agegroup}
                  onValueChange={(value) => setFormData({ ...formData, agegroup: value })}
                >
                  <SelectTrigger id="agegroup">
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
                <Label htmlFor="sex">Sex *</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(value) => setFormData({ ...formData, sex: value })}
                >
                  <SelectTrigger id="sex">
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

              {/* Reference Range */}
              <div className="col-span-2 mt-4">
                <h3 className="font-semibold mb-3">Reference Range</h3>
              </div>

              <div>
                <Label htmlFor="referencemin">Reference Min (numeric)</Label>
                <Input
                  id="referencemin"
                  type="number"
                  step="any"
                  value={formData.referencemin}
                  onChange={(e) => setFormData({ ...formData, referencemin: e.target.value })}
                  placeholder="e.g., 13.0"
                />
              </div>

              <div>
                <Label htmlFor="referencemax">Reference Max (numeric)</Label>
                <Input
                  id="referencemax"
                  type="number"
                  step="any"
                  value={formData.referencemax}
                  onChange={(e) => setFormData({ ...formData, referencemax: e.target.value })}
                  placeholder="e.g., 17.0"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="referencetext">Reference Text (for non-numeric)</Label>
                <Input
                  id="referencetext"
                  value={formData.referencetext}
                  onChange={(e) => setFormData({ ...formData, referencetext: e.target.value })}
                  placeholder="e.g., Negative, Absent, Non-reactive"
                />
              </div>

              {/* Panic/Critical Values */}
              <div className="col-span-2 mt-4">
                <h3 className="font-semibold mb-3">Panic/Critical Values</h3>
              </div>

              <div>
                <Label htmlFor="paniclow">Panic Low (numeric)</Label>
                <Input
                  id="paniclow"
                  type="number"
                  step="any"
                  value={formData.paniclow}
                  onChange={(e) => setFormData({ ...formData, paniclow: e.target.value })}
                  placeholder="e.g., 7"
                />
              </div>

              <div>
                <Label htmlFor="panichigh">Panic High (numeric)</Label>
                <Input
                  id="panichigh"
                  type="number"
                  step="any"
                  value={formData.panichigh}
                  onChange={(e) => setFormData({ ...formData, panichigh: e.target.value })}
                  placeholder="e.g., 20"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="panictext">Panic Text (for non-numeric)</Label>
                <Input
                  id="panictext"
                  value={formData.panictext}
                  onChange={(e) => setFormData({ ...formData, panictext: e.target.value })}
                  placeholder="e.g., Positive, Present, Reactive"
                />
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes or comments..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {editingRange ? "Update" : "Create"}
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
