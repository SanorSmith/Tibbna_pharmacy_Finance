"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Plus,
  Edit,
  PowerOff,
  Power,
  Search,
  Loader2,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";

interface LabTest {
  testid: string;
  testcode: string;
  testname: string;
  testdescription: string | null;
  testcategory: string;
  testpanel: string | null;
  loinccode: string | null;
  loincname: string | null;
  snomedcode: string | null;
  snomedname: string | null;
  specimentype: string;
  specimenvolume: string | null;
  specimencontainer: string | null;
  turnaroundtime: string | null;
  fastingrequired: boolean;
  isactive: boolean;
  workspaceid: string;
  createdat: string;
  updatedat: string;
}

type FormData = Omit<LabTest, "testid" | "workspaceid" | "createdat" | "updatedat">;

const EMPTY_FORM: FormData = {
  testcode: "",
  testname: "",
  testdescription: "",
  testcategory: "",
  testpanel: "",
  loinccode: "",
  loincname: "",
  snomedcode: "",
  snomedname: "",
  specimentype: "",
  specimenvolume: "",
  specimencontainer: "",
  turnaroundtime: "",
  fastingrequired: false,
  isactive: true,
};

const CATEGORIES = [
  "Hematology",
  "Biochemistry",
  "Microbiology",
  "Immunology",
  "Histopathology",
  "Endocrinology",
  "Serology",
  "Urinalysis",
  "Coagulation",
  "Clinical Chemistry",
  "Molecular Biology",
  "Cytology",
];

const SPECIMEN_TYPES = [
  "Blood",
  "Urine",
  "Serum",
  "Plasma",
  "Stool",
  "Swab",
  "CSF",
  "Sputum",
  "Tissue",
  "Other",
];

const PAGE_SIZE = 20;

interface TestCatalogManagerProps {
  workspaceid: string;
}

export default function TestCatalogManager({ workspaceid }: TestCatalogManagerProps) {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const [deactivateTarget, setDeactivateTarget] = useState<LabTest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ workspaceid });
      if (activeFilter !== "all") params.set("active", activeFilter === "active" ? "true" : "false");
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/test-catalog?${params}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to load tests");
        return;
      }
      const data = await res.json();
      setTests(data.tests || []);
      setCurrentPage(1);
    } catch {
      setError("Failed to load test catalog");
    } finally {
      setLoading(false);
    }
  }, [workspaceid, activeFilter, search]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const uniqueCategories = Array.from(new Set(tests.map((t) => t.testcategory))).sort();

  const filtered = tests.filter((t) =>
    categoryFilter === "all" ? true : t.testcategory === categoryFilter,
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function openAdd() {
    setEditingTest(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(test: LabTest) {
    setEditingTest(test);
    setForm({
      testcode: test.testcode,
      testname: test.testname,
      testdescription: test.testdescription || "",
      testcategory: test.testcategory,
      testpanel: test.testpanel || "",
      loinccode: test.loinccode || "",
      loincname: test.loincname || "",
      snomedcode: test.snomedcode || "",
      snomedname: test.snomedname || "",
      specimentype: test.specimentype,
      specimenvolume: test.specimenvolume || "",
      specimencontainer: test.specimencontainer || "",
      turnaroundtime: test.turnaroundtime || "",
      fastingrequired: test.fastingrequired,
      isactive: test.isactive,
    });
    setShowForm(true);
  }

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.testcode || !form.testname || !form.testcategory || !form.specimentype) {
      setError("Test code, name, category and specimen type are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, workspaceid };
      const url = editingTest
        ? `/api/admin/test-catalog/${editingTest.testid}`
        : "/api/admin/test-catalog";
      const method = editingTest ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save test");
        return;
      }
      setShowForm(false);
      fetchTests();
    } catch {
      setError("Failed to save test");
    } finally {
      setSaving(false);
    }
  }

  async function loadDefaultTests() {
    setSeeding(true);
    setError(null);
    setSeedMessage(null);
    try {
      const res = await fetch("/api/admin/test-catalog/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load default tests");
        return;
      }
      setSeedMessage(`${data.total} tests now in catalog`);
      fetchTests();
    } catch {
      setError("Failed to load default tests");
    } finally {
      setSeeding(false);
    }
  }

  async function handleDeactivate(test: LabTest) {
    setSaving(true);
    setError(null);
    try {
      const newActive = !test.isactive;
      const url = `/api/admin/test-catalog/${test.testid}`;
      const method = newActive ? "PUT" : "DELETE";
      const params = newActive ? "" : `?workspaceid=${workspaceid}`;

      const res = await fetch(`${url}${params}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: newActive ? JSON.stringify({ workspaceid, isactive: true }) : undefined,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update test status");
        return;
      }
      setDeactivateTarget(null);
      fetchTests();
    } catch {
      setError("Failed to update test status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Test Catalog Management</h3>
          <p className="text-sm text-muted-foreground">
            Add, edit, and manage laboratory test types available for ordering
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-[#618FF5] text-[#618FF5] hover:bg-blue-50"
            onClick={loadDefaultTests}
            disabled={seeding}
            title="Load the built-in set of 30 common lab tests"
          >
            {seeding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {seeding ? "Loading…" : "Load Default Tests"}
          </Button>
          <Button
            className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
            onClick={openAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Test
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}
      {seedMessage && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          ✓ {seedMessage}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, name or category..."
                className="pl-8 h-9 text-sm"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}
            >
              <SelectTrigger className="h-9 w-44 text-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={activeFilter}
              onValueChange={(v) => { setActiveFilter(v as "all" | "active" | "inactive"); setCurrentPage(1); }}
            >
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filtered.length} test{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#618FF5]" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <FlaskConical className="h-8 w-8 opacity-40" />
              <p className="text-sm font-medium">No tests in catalog yet</p>
              <p className="text-xs text-muted-foreground">
                Load the default tests or add them manually
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  size="sm"
                  className="bg-[#618FF5] text-white hover:bg-[#618FF5]"
                  onClick={loadDefaultTests}
                  disabled={seeding}
                >
                  {seeding ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {seeding ? "Loading…" : "Load Default Tests (30)"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={openAdd}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Manually
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#618FF5]/10">
                    <TableHead className="text-xs font-semibold py-2 px-3 w-8">#</TableHead>
                    <TableHead className="text-xs font-semibold py-2 px-3">Code</TableHead>
                    <TableHead className="text-xs font-semibold py-2 px-3">Name</TableHead>
                    <TableHead className="text-xs font-semibold py-2 px-3">Category</TableHead>
                    <TableHead className="text-xs font-semibold py-2 px-3">Specimen</TableHead>
                    <TableHead className="text-xs font-semibold py-2 px-3">TAT</TableHead>
                    <TableHead className="text-xs font-semibold py-2 px-3">Fasting</TableHead>
                    <TableHead className="text-xs font-semibold py-2 px-3">LOINC</TableHead>
                    <TableHead className="text-xs font-semibold py-2 px-3">Status</TableHead>
                    <TableHead className="text-xs font-semibold py-2 px-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((test, idx) => (
                    <TableRow key={test.testid} className="text-xs hover:bg-muted/40">
                      <TableCell className="py-1.5 px-3 text-muted-foreground">
                        {(currentPage - 1) * PAGE_SIZE + idx + 1}
                      </TableCell>
                      <TableCell className="py-1.5 px-3 font-mono font-medium text-[#618FF5]">
                        {test.testcode}
                      </TableCell>
                      <TableCell className="py-1.5 px-3 font-medium max-w-48 truncate">
                        {test.testname}
                      </TableCell>
                      <TableCell className="py-1.5 px-3">{test.testcategory}</TableCell>
                      <TableCell className="py-1.5 px-3">{test.specimentype}</TableCell>
                      <TableCell className="py-1.5 px-3 text-muted-foreground">
                        {test.turnaroundtime ? `${test.turnaroundtime}h` : "—"}
                      </TableCell>
                      <TableCell className="py-1.5 px-3">
                        {test.fastingrequired ? (
                          <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 px-3 font-mono text-muted-foreground">
                        {test.loinccode || "—"}
                      </TableCell>
                      <TableCell className="py-1.5 px-3">
                        {test.isactive ? (
                          <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-500 border-gray-200">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-[#618FF5] hover:text-[#4a6fd4] hover:bg-blue-50"
                            title="Edit test"
                            onClick={() => openEdit(test)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 w-6 p-0 hover:bg-opacity-10 ${
                              test.isactive
                                ? "text-red-500 hover:text-red-700 hover:bg-red-50"
                                : "text-green-600 hover:text-green-700 hover:bg-green-50"
                            }`}
                            title={test.isactive ? "Deactivate test" : "Reactivate test"}
                            onClick={() =>
                              test.isactive
                                ? setDeactivateTarget(test)
                                : handleDeactivate(test)
                            }
                          >
                            {test.isactive ? (
                              <PowerOff className="h-3.5 w-3.5" />
                            ) : (
                              <Power className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
                    {filtered.length} tests
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
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === totalPages ||
                          Math.abs(p - currentPage) <= 1,
                      )
                      .reduce<(number | "...")[]>((acc, p, i, arr) => {
                        if (i > 0 && (p as number) - (arr[i - 1] as number) > 1)
                          acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "..." ? (
                          <span
                            key={`ellipsis-${i}`}
                            className="text-xs px-1 text-muted-foreground"
                          >
                            …
                          </span>
                        ) : (
                          <Button
                            key={p}
                            variant={currentPage === p ? "default" : "outline"}
                            size="sm"
                            className={`h-7 w-7 p-0 text-xs ${
                              currentPage === p
                                ? "bg-[#618FF5] text-white hover:bg-[#618FF5]"
                                : ""
                            }`}
                            onClick={() => setCurrentPage(p as number)}
                          >
                            {p}
                          </Button>
                        ),
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTest ? "Edit Test" : "Add New Test to Catalog"}
            </DialogTitle>
            <DialogDescription>
              {editingTest
                ? `Editing: ${editingTest.testname} (${editingTest.testcode})`
                : "Fill in the test details. Required fields are marked with *."}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 py-2">
            {/* Test Code */}
            <div className="space-y-1.5">
              <Label htmlFor="testcode" className="text-xs font-medium">
                Test Code *
              </Label>
              <Input
                id="testcode"
                placeholder="e.g. CBC, HBA1C"
                className="h-8 text-sm uppercase"
                value={form.testcode}
                disabled={!!editingTest}
                onChange={(e) => setField("testcode", e.target.value.toUpperCase())}
              />
              {editingTest && (
                <p className="text-[10px] text-muted-foreground">
                  Test code cannot be changed after creation
                </p>
              )}
            </div>

            {/* Test Name */}
            <div className="space-y-1.5">
              <Label htmlFor="testname" className="text-xs font-medium">
                Test Name *
              </Label>
              <Input
                id="testname"
                placeholder="e.g. Complete Blood Count"
                className="h-8 text-sm"
                value={form.testname}
                onChange={(e) => setField("testname", e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="testcategory" className="text-xs font-medium">
                Category *
              </Label>
              <Select
                value={form.testcategory}
                onValueChange={(v) => setField("testcategory", v)}
              >
                <SelectTrigger id="testcategory" className="h-8 text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specimen Type */}
            <div className="space-y-1.5">
              <Label htmlFor="specimentype" className="text-xs font-medium">
                Specimen Type *
              </Label>
              <Select
                value={form.specimentype}
                onValueChange={(v) => setField("specimentype", v)}
              >
                <SelectTrigger id="specimentype" className="h-8 text-sm">
                  <SelectValue placeholder="Select specimen" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIMEN_TYPES.map((s) => (
                    <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Panel */}
            <div className="space-y-1.5">
              <Label htmlFor="testpanel" className="text-xs font-medium">
                Panel / Group
              </Label>
              <Input
                id="testpanel"
                placeholder="e.g. Liver Function Panel"
                className="h-8 text-sm"
                value={form.testpanel || ""}
                onChange={(e) => setField("testpanel", e.target.value)}
              />
            </div>

            {/* TAT */}
            <div className="space-y-1.5">
              <Label htmlFor="turnaroundtime" className="text-xs font-medium">
                Turnaround Time (hours)
              </Label>
              <Input
                id="turnaroundtime"
                placeholder="e.g. 24"
                type="number"
                min="0"
                className="h-8 text-sm"
                value={form.turnaroundtime || ""}
                onChange={(e) => setField("turnaroundtime", e.target.value)}
              />
            </div>

            {/* Specimen Container */}
            <div className="space-y-1.5">
              <Label htmlFor="specimencontainer" className="text-xs font-medium">
                Specimen Container
              </Label>
              <Input
                id="specimencontainer"
                placeholder="e.g. EDTA Tube, Serum Tube"
                className="h-8 text-sm"
                value={form.specimencontainer || ""}
                onChange={(e) => setField("specimencontainer", e.target.value)}
              />
            </div>

            {/* Specimen Volume */}
            <div className="space-y-1.5">
              <Label htmlFor="specimenvolume" className="text-xs font-medium">
                Specimen Volume
              </Label>
              <Input
                id="specimenvolume"
                placeholder="e.g. 3 mL"
                className="h-8 text-sm"
                value={form.specimenvolume || ""}
                onChange={(e) => setField("specimenvolume", e.target.value)}
              />
            </div>

            {/* LOINC Code */}
            <div className="space-y-1.5">
              <Label htmlFor="loinccode" className="text-xs font-medium">
                LOINC Code
              </Label>
              <Input
                id="loinccode"
                placeholder="e.g. 58410-2"
                className="h-8 text-sm font-mono"
                value={form.loinccode || ""}
                onChange={(e) => setField("loinccode", e.target.value)}
              />
            </div>

            {/* LOINC Name */}
            <div className="space-y-1.5">
              <Label htmlFor="loincname" className="text-xs font-medium">
                LOINC Name
              </Label>
              <Input
                id="loincname"
                placeholder="e.g. CBC panel - Blood by Automated count"
                className="h-8 text-sm"
                value={form.loincname || ""}
                onChange={(e) => setField("loincname", e.target.value)}
              />
            </div>

            {/* SNOMED Code */}
            <div className="space-y-1.5">
              <Label htmlFor="snomedcode" className="text-xs font-medium">
                SNOMED CT Code
              </Label>
              <Input
                id="snomedcode"
                placeholder="e.g. 26604007"
                className="h-8 text-sm font-mono"
                value={form.snomedcode || ""}
                onChange={(e) => setField("snomedcode", e.target.value)}
              />
            </div>

            {/* SNOMED Name */}
            <div className="space-y-1.5">
              <Label htmlFor="snomedname" className="text-xs font-medium">
                SNOMED CT Name
              </Label>
              <Input
                id="snomedname"
                placeholder="e.g. Complete blood count"
                className="h-8 text-sm"
                value={form.snomedname || ""}
                onChange={(e) => setField("snomedname", e.target.value)}
              />
            </div>

            {/* Description — full width */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="testdescription" className="text-xs font-medium">
                Description
              </Label>
              <Input
                id="testdescription"
                placeholder="Brief description of what this test measures"
                className="h-8 text-sm"
                value={form.testdescription || ""}
                onChange={(e) => setField("testdescription", e.target.value)}
              />
            </div>

            {/* Fasting Required */}
            <div className="flex items-center gap-2 pt-1">
              <Switch
                id="fastingrequired"
                checked={form.fastingrequired}
                onCheckedChange={(v) => setField("fastingrequired", v)}
              />
              <Label htmlFor="fastingrequired" className="text-xs font-medium cursor-pointer">
                Fasting Required
              </Label>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2 pt-1">
              <Switch
                id="isactive"
                checked={form.isactive}
                onCheckedChange={(v) => setField("isactive", v)}
              />
              <Label htmlFor="isactive" className="text-xs font-medium cursor-pointer">
                Active (available for ordering)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowForm(false); setError(null); }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {editingTest ? "Save Changes" : "Add Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Test</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{" "}
              <strong>{deactivateTarget?.testname}</strong> (
              {deactivateTarget?.testcode})? It will no longer appear in the
              test catalog for ordering. You can reactivate it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deactivateTarget && handleDeactivate(deactivateTarget)}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
