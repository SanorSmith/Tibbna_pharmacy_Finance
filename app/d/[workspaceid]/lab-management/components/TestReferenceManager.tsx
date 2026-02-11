"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, Save, X, Search, Eye, Upload, ChevronDown, History } from "lucide-react";
import { LAB_TYPES, TEST_GROUPS, getAllTestGroupNames } from "@/lib/test-groups-and-lab-types";
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
  createdby?: string;
  createdat?: string;
  updatedby?: string;
  updatedat?: string;
  createdbyname?: string;
  updatedbyname?: string;
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
  const [updateReason, setUpdateReason] = useState("");
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [auditRangeId, setAuditRangeId] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [labtypeFilter, setLabtypeFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [filterAgeGroup, setFilterAgeGroup] = useState("ALL");

  // Combo-box dropdown states
  const [showLabTypeDropdown, setShowLabTypeDropdown] = useState(false);
  const [showGroupTestsDropdown, setShowGroupTestsDropdown] = useState(false);
  const [labTypeSearch, setLabTypeSearch] = useState("");
  const [groupTestsSearch, setGroupTestsSearch] = useState("");

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
  }, [ranges, searchTerm, labtypeFilter, groupFilter, filterAgeGroup]);

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

  // Derive unique group options from data, qualified by lab type when "All Lab Types" is selected
  const availableGroupOptions: { value: string; label: string }[] = (() => {
    if (labtypeFilter !== "all") {
      // Single lab type selected — plain group names, no ambiguity
      const source = ranges.filter(r => r.labtype === labtypeFilter);
      const groups = Array.from(new Set(source.map(r => r.grouptests).filter(Boolean) as string[])).sort();
      return groups.map(g => ({ value: g, label: g }));
    }
    // All lab types — build "labtype::group" compound keys to disambiguate duplicates
    const pairs = new Set<string>();
    for (const r of ranges) {
      if (r.grouptests && r.labtype) pairs.add(`${r.labtype}::${r.grouptests}`);
      else if (r.grouptests) pairs.add(`::${r.grouptests}`);
    }
    // Check which group names appear under multiple lab types
    const groupToLabTypes = new Map<string, Set<string>>();
    for (const p of pairs) {
      const [lab, grp] = p.split("::");
      if (!groupToLabTypes.has(grp)) groupToLabTypes.set(grp, new Set());
      groupToLabTypes.get(grp)!.add(lab);
    }
    const result: { value: string; label: string }[] = [];
    for (const p of Array.from(pairs).sort()) {
      const [lab, grp] = p.split("::");
      const isDuplicate = (groupToLabTypes.get(grp)?.size || 0) > 1;
      result.push({
        value: p, // compound key "labtype::group"
        label: isDuplicate ? `${lab} → ${grp}` : grp,
      });
    }
    return result;
  })();

  const applyFilters = () => {
    let filtered = [...ranges];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.testcode.toLowerCase().includes(term) ||
          r.testname.toLowerCase().includes(term) ||
          (r.grouptests && r.grouptests.toLowerCase().includes(term))
      );
    }

    if (labtypeFilter !== "all") {
      filtered = filtered.filter((r) => r.labtype === labtypeFilter);
    }

    if (groupFilter !== "all") {
      if (groupFilter.includes("::")) {
        // Compound key: "labtype::group"
        const [lab, grp] = groupFilter.split("::");
        filtered = filtered.filter((r) => r.labtype === lab && r.grouptests === grp);
      } else {
        filtered = filtered.filter((r) => r.grouptests === groupFilter);
      }
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
    setUpdateReason("");
    setShowDialog(true);
  };

  const fetchAuditLogs = async (rangeid: string) => {
    setLoadingAuditLogs(true);
    setAuditRangeId(rangeid);
    try {
      const res = await fetch(`/api/d/${workspaceid}/test-reference-ranges/audit-log?rangeid=${rangeid}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoadingAuditLogs(false);
      setShowAuditLog(true);
    }
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
          body: JSON.stringify({ rangeid: editingRange.rangeid, updateReason, ...payload }),
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

  // Derive unique lab types and group names from existing data + static list
  const existingLabTypes = Array.from(new Set([
    ...LAB_TYPES,
    ...ranges.map(r => r.labtype).filter(Boolean) as string[]
  ])).sort();

  // Filter group tests based on selected lab type
  const existingGroupTests = (() => {
    const selectedLab = formData.labtype;
    // Get static groups matching the selected lab type
    const staticGroups = selectedLab
      ? Object.values(TEST_GROUPS).filter(g => g.labType === selectedLab).map(g => g.name)
      : getAllTestGroupNames();
    // Get DB groups matching the selected lab type
    const dbGroups = selectedLab
      ? ranges.filter(r => r.labtype === selectedLab && r.grouptests).map(r => r.grouptests!)
      : ranges.map(r => r.grouptests).filter(Boolean) as string[];
    return Array.from(new Set([...staticGroups, ...dbGroups])).sort();
  })();

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
    <Card className="flex flex-col" style={{ height: 'calc(100vh - 10rem)' }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b">
        <span className="text-sm font-semibold">Test Reference Ranges</span>
        <Button size="sm" className="h-7 text-xs" onClick={() => handleOpenDialog()}>
          <Plus className="h-3 w-3 mr-1" />
          Add Test Reference
        </Button>
      </div>
      <CardContent className="flex-1 flex flex-col overflow-hidden px-3 pt-1.5 pb-1">
        {/* Filters */}
        <div className="mb-1 flex items-center gap-2 flex-shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              id="search"
              placeholder="Search by code, name or group..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>
          <Select value={labtypeFilter} onValueChange={(v) => { setLabtypeFilter(v); setGroupFilter("all"); }}>
            <SelectTrigger className="h-7 text-xs w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lab Types</SelectItem>
              {LAB_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="h-7 text-xs w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Test Groups</SelectItem>
              {availableGroupOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAgeGroup} onValueChange={setFilterAgeGroup}>
            <SelectTrigger className="h-7 text-xs w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Age Groups</SelectItem>
              {AGE_GROUPS.map((ag) => (
                <SelectItem key={ag.value} value={ag.value}>{ag.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-[11px] whitespace-nowrap">
            {filteredRanges.length} ranges
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2"
            onClick={() => {
              setSearchTerm("");
              setLabtypeFilter("all");
              setGroupFilter("all");
              setFilterAgeGroup("ALL");
            }}
          >
            Clear
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredRanges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No reference ranges found. Click "Add Test Reference" to create one.
          </div>
        ) : (
          <div className="flex-1 border rounded-lg overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="sticky top-0 z-10 [&_tr]:border-b">
                  <tr className="text-xs border-b">
                    <th className="font-semibold px-1 py-2 w-14 bg-gray-50 text-left text-foreground align-middle">Code</th>
                    <th className="font-semibold px-1 py-2 w-28 bg-gray-50 text-left text-foreground align-middle">Test Name</th>
                    <th className="font-semibold px-1 py-2 w-16 bg-gray-50 text-left text-foreground align-middle">Lab</th>
                    <th className="font-semibold px-1 py-2 w-20 bg-gray-50 text-left text-foreground align-middle">Group</th>
                    <th className="font-semibold px-1 py-2 w-16 bg-gray-50 text-left text-foreground align-middle">Sample</th>
                    <th className="font-semibold px-1 py-2 w-16 bg-gray-50 text-left text-foreground align-middle">Container</th>
                    <th className="font-semibold px-1 py-2 w-20 bg-gray-50 text-left text-foreground align-middle">Body Site</th>
                    <th className="font-semibold px-1 py-2 w-10 bg-gray-50 text-center text-foreground align-middle">Age</th>
                    <th className="font-semibold px-1 py-2 w-10 bg-gray-50 text-center text-foreground align-middle">Sex</th>
                    <th className="font-semibold px-1 py-2 w-24 bg-gray-50 text-left text-foreground align-middle">Reference</th>
                    <th className="font-semibold px-1 py-2 w-14 bg-gray-50 text-left text-foreground align-middle">Unit</th>
                    <th className="font-semibold px-1 py-2 w-16 bg-gray-50 text-left text-red-600 align-middle">Panic</th>
                    <th className="font-semibold px-1 py-2 w-28 bg-gray-50 text-left text-foreground align-middle">Clinical</th>
                    <th className="font-semibold px-1 py-2 w-20 bg-gray-50 text-center text-foreground align-middle">Actions</th>
                  </tr>
                </thead>
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
                      <TableCell className="px-1 py-1.5">
                        <div className="truncate max-w-[90px]" title={getReferenceDisplay(range)}>
                          {getReferenceDisplay(range)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono px-1 py-1.5">
                        <div className="truncate max-w-[50px]" title={range.unit}>
                          {range.unit}
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
                            onClick={() => fetchAuditLogs(range.rangeid)}
                            title="Change History"
                          >
                            <History className="h-3 w-3 text-orange-600" />
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
              </table>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-[75vw] max-h-[85vh] overflow-y-auto p-4">
            <DialogHeader className="pb-0 mb-1">
              <DialogTitle className="text-sm">
                {editingRange ? "Edit Test Reference Range" : "Add Test Reference Range"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-6 gap-x-2 gap-y-1">
              {/* Row 1: Test Code, Test Name, Unit, Age Group, Sex */}
              <div>
                <Label className="text-[10px]">Test Code *</Label>
                <Input className="h-6 text-[11px]" value={formData.testcode} onChange={(e) => setFormData({ ...formData, testcode: e.target.value.toUpperCase() })} placeholder="HGB" />
              </div>
              <div>
                <Label className="text-[10px]">Test Name *</Label>
                <Input className="h-6 text-[11px]" value={formData.testname} onChange={(e) => setFormData({ ...formData, testname: e.target.value })} placeholder="Hemoglobin" />
              </div>
              <div>
                <Label className="text-[10px]">Unit *</Label>
                <Input className="h-6 text-[11px]" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="g/dL" />
              </div>
              <div>
                <Label className="text-[10px]">Age Group *</Label>
                <Select value={formData.agegroup} onValueChange={(v) => setFormData({ ...formData, agegroup: v })}>
                  <SelectTrigger className="h-6 text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{AGE_GROUPS.map((ag) => <SelectItem key={ag.value} value={ag.value}>{ag.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Sex *</Label>
                <Select value={formData.sex} onValueChange={(v) => setFormData({ ...formData, sex: v })}>
                  <SelectTrigger className="h-6 text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{SEX_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Label className="text-[10px]">Lab Type</Label>
                <div className="relative">
                  <Input
                    className="h-6 text-[11px] pr-6"
                    value={formData.labtype}
                    onChange={(e) => {
                      setFormData({ ...formData, labtype: e.target.value, grouptests: "" });
                      setLabTypeSearch(e.target.value);
                      setShowLabTypeDropdown(true);
                    }}
                    onFocus={() => { setLabTypeSearch(formData.labtype); setShowLabTypeDropdown(true); }}
                    onBlur={() => setTimeout(() => setShowLabTypeDropdown(false), 150)}
                    placeholder="Type or select"
                  />
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                </div>
                {showLabTypeDropdown && (() => {
                  const filtered = existingLabTypes.filter(t => t.toLowerCase().includes((labTypeSearch || "").toLowerCase()));
                  return filtered.length > 0 ? (
                    <div className="absolute z-50 mt-0.5 w-full bg-white border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                      {filtered.map(t => (
                        <button key={t} type="button" className="w-full text-left px-2 py-1 text-[11px] hover:bg-blue-50 truncate" onMouseDown={() => { setFormData({ ...formData, labtype: t, grouptests: "" }); setShowLabTypeDropdown(false); }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Row 2: Group Tests, Sample Type, Container, Body Site */}
              <div className="relative">
                <Label className="text-[10px]">Group Tests</Label>
                <div className="relative">
                  <Input
                    className="h-6 text-[11px] pr-6"
                    value={formData.grouptests}
                    onChange={(e) => {
                      setFormData({ ...formData, grouptests: e.target.value });
                      setGroupTestsSearch(e.target.value);
                      setShowGroupTestsDropdown(true);
                    }}
                    onFocus={() => { setGroupTestsSearch(formData.grouptests); setShowGroupTestsDropdown(true); }}
                    onBlur={() => setTimeout(() => setShowGroupTestsDropdown(false), 150)}
                    placeholder="Type or select"
                  />
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                </div>
                {showGroupTestsDropdown && (() => {
                  const filtered = existingGroupTests.filter(g => g.toLowerCase().includes((groupTestsSearch || "").toLowerCase()));
                  return filtered.length > 0 ? (
                    <div className="absolute z-50 mt-0.5 w-full bg-white border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                      {filtered.map(g => (
                        <button key={g} type="button" className="w-full text-left px-2 py-1 text-[11px] hover:bg-blue-50 truncate" onMouseDown={() => { setFormData({ ...formData, grouptests: g }); setShowGroupTestsDropdown(false); }}>
                          {g}
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
              <div>
                <Label className="text-[10px]">Sample Type</Label>
                <Input className="h-6 text-[11px]" value={formData.sampletype} onChange={(e) => setFormData({ ...formData, sampletype: e.target.value })} placeholder="Blood, Serum" />
              </div>
              <div>
                <Label className="text-[10px]">Container</Label>
                <Input className="h-6 text-[11px]" value={formData.containertype} onChange={(e) => setFormData({ ...formData, containertype: e.target.value })} placeholder="EDTA tube" />
              </div>
              <div>
                <Label className="text-[10px]">Body Site</Label>
                <Input className="h-6 text-[11px]" value={formData.bodysite} onChange={(e) => setFormData({ ...formData, bodysite: e.target.value })} placeholder="Venous blood" />
              </div>
              <div className="col-span-2" />

              {/* Row 3 header: Reference Range & Panic Values */}
              <div className="col-span-6 mt-1 border-t pt-1">
                <span className="font-semibold text-[11px]">Reference Range & Panic Values</span>
              </div>

              {/* Row 3: Ref Min, Ref Max, Unit, Ref Text, Panic Low, Panic High */}
              <div>
                <Label className="text-[10px]">Ref Min</Label>
                <Input className="h-6 text-[11px]" type="number" step="any" value={formData.referencemin} onChange={(e) => setFormData({ ...formData, referencemin: e.target.value })} placeholder="13.0" />
              </div>
              <div>
                <Label className="text-[10px]">Ref Max</Label>
                <Input className="h-6 text-[11px]" type="number" step="any" value={formData.referencemax} onChange={(e) => setFormData({ ...formData, referencemax: e.target.value })} placeholder="17.0" />
              </div>
              <div>
                <Label className="text-[10px]">Unit</Label>
                <Input className="h-6 text-[11px]" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="ng/mL" />
              </div>
              <div>
                <Label className="text-[10px]">Ref Text</Label>
                <Input className="h-6 text-[11px]" value={formData.referencetext} onChange={(e) => setFormData({ ...formData, referencetext: e.target.value })} placeholder="Negative" />
              </div>
              <div>
                <Label className="text-[10px]">Panic Low</Label>
                <Input className="h-6 text-[11px]" type="number" step="any" value={formData.paniclow} onChange={(e) => setFormData({ ...formData, paniclow: e.target.value })} placeholder="7" />
              </div>
              <div>
                <Label className="text-[10px]">Panic High</Label>
                <Input className="h-6 text-[11px]" type="number" step="any" value={formData.panichigh} onChange={(e) => setFormData({ ...formData, panichigh: e.target.value })} placeholder="20" />
              </div>
              {/* Row 4: Panic Text */}
              <div>
                <Label className="text-[10px]">Panic Text</Label>
                <Input className="h-6 text-[11px]" value={formData.panictext} onChange={(e) => setFormData({ ...formData, panictext: e.target.value })} placeholder="Positive" />
              </div>

              {/* Row 4: Clinical Indication + Additional Info */}
              <div className="col-span-3 mt-1">
                <Label className="text-[10px]">Clinical Indication</Label>
                <Input className="h-6 text-[11px]" value={formData.clinicalindication} onChange={(e) => setFormData({ ...formData, clinicalindication: e.target.value })} placeholder="Screening for anemia, Diabetes monitoring" />
              </div>
              <div className="col-span-3 mt-1">
                <Label className="text-[10px]">Additional Info</Label>
                <Input className="h-6 text-[11px]" value={formData.additionalinformation} onChange={(e) => setFormData({ ...formData, additionalinformation: e.target.value })} placeholder="Special handling requirements" />
              </div>
            </div>

            {editingRange && (
              <div className="col-span-6 mt-1 border-t pt-1">
                <Label className="text-[10px] font-semibold text-orange-700">Reason for Update *</Label>
                <Textarea
                  className="mt-0.5 text-[11px] min-h-[40px]"
                  value={updateReason}
                  onChange={(e) => setUpdateReason(e.target.value)}
                  placeholder="e.g., Updated reference range per new WHO guidelines, Corrected unit from mg/dL to mmol/L"
                  rows={2}
                />
              </div>
            )}

            <DialogFooter className="pt-1">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="h-7 text-xs">
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="h-7 text-xs"
                disabled={editingRange ? !updateReason.trim() : false}
              >
                <Save className="h-3 w-3 mr-1" /> {editingRange ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details View Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-[60vw] max-h-[80vh] overflow-y-auto p-4">
            <DialogHeader className="pb-0 mb-1">
              <DialogTitle className="text-sm">{viewingRange?.testcode} — {viewingRange?.testname}</DialogTitle>
            </DialogHeader>

            {viewingRange && (
              <div className="space-y-2 text-[11px]">
                {/* Row 1: Core info */}
                <div className="grid grid-cols-6 gap-x-3 gap-y-1">
                  <div><span className="text-[10px] text-gray-500">Code</span><p className="font-medium">{viewingRange.testcode}</p></div>
                  <div><span className="text-[10px] text-gray-500">Name</span><p className="font-medium">{viewingRange.testname}</p></div>
                  <div><span className="text-[10px] text-gray-500">Unit</span><p className="font-mono">{viewingRange.unit}</p></div>
                  <div><span className="text-[10px] text-gray-500">Lab Type</span><p><Badge variant="outline" className="text-[10px] px-1 py-0">{viewingRange.labtype || "—"}</Badge></p></div>
                  <div><span className="text-[10px] text-gray-500">Age</span><p><Badge variant="secondary" className="text-[10px] px-1 py-0">{viewingRange.agegroup}</Badge></p></div>
                  <div><span className="text-[10px] text-gray-500">Sex</span><p><Badge variant="secondary" className="text-[10px] px-1 py-0">{SEX_OPTIONS.find(s => s.value === viewingRange.sex)?.label || viewingRange.sex}</Badge></p></div>
                </div>

                {/* Row 2: Specimen */}
                <div className="grid grid-cols-5 gap-x-3 gap-y-1 border-t pt-1">
                  <div><span className="text-[10px] text-gray-500">Group</span><p>{viewingRange.grouptests || "—"}</p></div>
                  <div><span className="text-[10px] text-gray-500">Sample</span><p>{viewingRange.sampletype || "—"}</p></div>
                  <div><span className="text-[10px] text-gray-500">Container</span><p>{viewingRange.containertype || "—"}</p></div>
                  <div><span className="text-[10px] text-gray-500">Body Site</span><p>{viewingRange.bodysite || "—"}</p></div>
                  <div><span className="text-[10px] text-gray-500">Status</span><p><Badge variant={viewingRange.isactive === "Y" ? "default" : "destructive"} className="text-[10px] px-1 py-0">{viewingRange.isactive === "Y" ? "Active" : "Inactive"}</Badge></p></div>
                </div>

                {/* Row 3: Reference + Panic */}
                <div className="grid grid-cols-2 gap-3 border-t pt-1">
                  <div>
                    <span className="text-[10px] text-gray-500 font-semibold">Reference Range</span>
                    <p className="font-medium text-blue-600">{getReferenceDisplay(viewingRange)}</p>
                    <div className="flex gap-3 mt-0.5 text-[10px] text-gray-500">
                      <span>Min: <span className="font-mono text-gray-800">{viewingRange.referencemin || "—"}</span></span>
                      <span>Max: <span className="font-mono text-gray-800">{viewingRange.referencemax || "—"}</span></span>
                      {viewingRange.referencetext && <span>Text: <span className="text-gray-800">{viewingRange.referencetext}</span></span>}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-red-600 font-semibold">Panic / Critical</span>
                    <p className="font-medium text-red-600">{getPanicDisplay(viewingRange)}</p>
                    <div className="flex gap-3 mt-0.5 text-[10px] text-gray-500">
                      <span>Low: <span className="font-mono text-red-600">{viewingRange.paniclow || "—"}</span></span>
                      <span>High: <span className="font-mono text-red-600">{viewingRange.panichigh || "—"}</span></span>
                      {viewingRange.panictext && <span>Text: <span className="text-red-600">{viewingRange.panictext}</span></span>}
                    </div>
                  </div>
                </div>

                {/* Row 4: Clinical */}
                {(viewingRange.clinicalindication || viewingRange.additionalinformation || viewingRange.notes) && (
                  <div className="border-t pt-1">
                    <span className="text-[10px] text-gray-500 font-semibold">Clinical</span>
                    <div className="grid grid-cols-3 gap-2 mt-0.5">
                      {viewingRange.clinicalindication && <div><span className="text-[10px] text-gray-500">Indication:</span><p>{viewingRange.clinicalindication}</p></div>}
                      {viewingRange.additionalinformation && <div><span className="text-[10px] text-gray-500">Additional:</span><p>{viewingRange.additionalinformation}</p></div>}
                      {viewingRange.notes && <div><span className="text-[10px] text-gray-500">Notes:</span><p>{viewingRange.notes}</p></div>}
                    </div>
                  </div>
                )}

                {/* Row 5: Audit info */}
                <div className="border-t pt-1 flex items-center gap-4 text-[10px] text-gray-400">
                  {viewingRange.createdat && (
                    <span>Created: {new Date(viewingRange.createdat).toLocaleDateString()}{viewingRange.createdbyname ? ` by ${viewingRange.createdbyname}` : ""}</span>
                  )}
                  {viewingRange.updatedat && (
                    <span>Updated: {new Date(viewingRange.updatedat).toLocaleDateString()}{viewingRange.updatedbyname ? ` by ${viewingRange.updatedbyname}` : ""}</span>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="pt-1">
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)} className="h-6 text-[11px] px-3">
                Close
              </Button>
              <Button variant="outline" onClick={() => { if (viewingRange) fetchAuditLogs(viewingRange.rangeid); }} className="h-6 text-[11px] px-3">
                <History className="h-3 w-3 mr-1 text-orange-600" /> History
              </Button>
              <Button onClick={() => { setShowDetailsDialog(false); handleOpenDialog(viewingRange!); }} className="h-6 text-[11px] px-3">
                <Edit2 className="h-3 w-3 mr-1" /> Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Audit Log Dialog */}
        <Dialog open={showAuditLog} onOpenChange={setShowAuditLog}>
          <DialogContent className="max-w-[70vw] max-h-[80vh] overflow-y-auto p-4">
            <DialogHeader className="pb-1">
              <DialogTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4 text-orange-600" />
                Change History
              </DialogTitle>
              <DialogDescription className="text-xs">
                Audit trail of all changes made to this test reference range
              </DialogDescription>
            </DialogHeader>

            {loadingAuditLogs ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading audit logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No change history found.</div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log: any) => (
                  <div key={log.logid} className="border rounded-lg p-3 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={log.action === "CREATE" ? "default" : log.action === "DELETE" ? "destructive" : "secondary"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {log.action}
                        </Badge>
                        <span className="font-medium">{log.username || "Unknown"}</span>
                      </div>
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(log.createdat).toLocaleString()}
                      </span>
                    </div>

                    {log.reason && (
                      <div className="mb-2 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                        <span className="font-medium text-orange-700">Reason: </span>
                        <span className="text-orange-900">{log.reason}</span>
                      </div>
                    )}

                    {log.action === "UPDATE" && log.changes && Object.keys(log.changes).length > 0 && (
                      <div className="mt-1">
                        <span className="font-semibold text-[10px] text-gray-600 uppercase">Changed Fields:</span>
                        <div className="mt-1 space-y-1">
                          {Object.entries(log.changes as Record<string, { old: any; new: any }>).map(([field, diff]) => (
                            <div key={field} className="grid grid-cols-[120px_1fr_1fr] gap-1 items-start">
                              <span className="font-medium text-gray-700 capitalize">{field.replace(/([A-Z])/g, " $1")}</span>
                              <div className="bg-red-50 rounded px-1.5 py-0.5 line-through text-red-700 truncate" title={String(diff.old || "—")}>
                                {String(diff.old || "—")}
                              </div>
                              <div className="bg-green-50 rounded px-1.5 py-0.5 text-green-700 truncate" title={String(diff.new || "—")}>
                                {String(diff.new || "—")}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setShowAuditLog(false)} className="h-7 text-xs">
                Close
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
