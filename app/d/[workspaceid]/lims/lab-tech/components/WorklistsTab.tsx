"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, ClipboardList, User, MapPin, Package, Plus, CheckCircle2, Trash2, Printer, Search } from "lucide-react";

interface WorklistItem {
  worklistitemid: string;
  orderid: string;
  sampleid: string;
  samplenumber: string;
  accessionnumber?: string;
  sampletype: string;
  tests?: unknown;
  currentlocation: string;
  barcode: string;
  patientName: string;
  patientid: string;
  addedbyname: string;
  addedat: string;
  status: string;
  openehrrequestid?: string;
  orderstatus: string;
  priority: string;
}

interface Worklist {
  worklistid: string;
  worklistname: string;
  department: string;
  priority: string;
  status: string;
  createdbyname: string;
  assignedtoname: string;
  description: string;
  createdat: string;
  itemCount: number;
}

export default function WorklistsTab({ workspaceid }: { workspaceid: string }) {
  const queryClient = useQueryClient();
  const [selectedWorklist, setSelectedWorklist] = useState<Worklist | null>(null);
  const [showWorklistDetail, setShowWorklistDetail] = useState(false);
  const [showCreateWorklistDialog, setShowCreateWorklistDialog] = useState(false);
  const [showEditWorklistDialog, setShowEditWorklistDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignToName, setAssignToName] = useState('');
  const [alertDialog, setAlertDialog] = useState<{ show: boolean; title: string; message: string }>({ show: false, title: '', message: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; item: WorklistItem | null }>({ show: false, item: null });
  const [deleteWorklistConfirm, setDeleteWorklistConfirm] = useState<{ show: boolean; worklist: Worklist | null }>({ show: false, worklist: null });
  const [worklistFormData, setWorklistFormData] = useState({
    worklistname: '',
    laboratory: '',
    description: '',
    priority: 'routine',
  });

  // Cancel worklist mutation (soft cancel via status)
  const cancelWorklistMutation = useMutation({
    mutationFn: async (worklistid: string) => {
      const response = await fetch('/api/lims/worklists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worklistid, status: 'cancelled' }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel worklist');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklists', workspaceid] });
      if (selectedWorklist) {
        setSelectedWorklist({ ...selectedWorklist, status: 'cancelled' });
      }
      setAlertDialog({ show: true, title: 'Success', message: 'Worklist cancelled successfully' });
    },
    onError: (error: Error) => {
      setAlertDialog({ show: true, title: 'Error', message: `Failed to cancel worklist: ${error.message}` });
    },
  });
  const [editWorklistFormData, setEditWorklistFormData] = useState({
    worklistname: '',
    department: '',
    description: '',
    priority: 'routine',
  });

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "done" | "all">("active");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [addSampleSearch, setAddSampleSearch] = useState("");

  // Fetch worklists
  const { data: worklists, isLoading: worklistsLoading } = useQuery<Worklist[]>({
    queryKey: ['worklists', workspaceid],
    queryFn: async () => {
      const response = await fetch(`/api/lims/worklists?workspaceid=${workspaceid}`);
      if (!response.ok) throw new Error('Failed to fetch worklists');
      const data = await response.json();
      return data.worklists;
    },
  });

  const isActiveStatus = (status: string) => status === "pending" || status === "in_progress";
  const isDoneStatus = (status: string) => status === "completed" || status === "cancelled";

  // Filter worklists based on search, status (active/done/all), and date
  const filteredWorklists = worklists?.filter((worklist: Worklist) => {
    // Search filter - matches worklist name, department, created by, assigned to, description
    const matchesSearch = 
      worklist.worklistname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (worklist.department && worklist.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (worklist.createdbyname && worklist.createdbyname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (worklist.assignedtoname && worklist.assignedtoname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (worklist.description && worklist.description.toLowerCase().includes(searchTerm.toLowerCase()));

    // Status filter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? isActiveStatus(worklist.status) : isDoneStatus(worklist.status));

    // Date range filter - matches creation date within range
    let matchesDate = true;
    if (dateRangeStart || dateRangeEnd) {
      const worklistDate = new Date(worklist.createdat);
      
      if (dateRangeStart) {
        const startDate = new Date(dateRangeStart);
        startDate.setHours(0, 0, 0, 0); // Start of day
        if (worklistDate < startDate) {
          matchesDate = false;
        }
      }
      
      if (dateRangeEnd && matchesDate) {
        const endDate = new Date(dateRangeEnd);
        endDate.setHours(23, 59, 59, 999); // End of day
        if (worklistDate > endDate) {
          matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  }) || [];

  const sortedFilteredWorklists = [...filteredWorklists].sort((a, b) => {
    const aActive = isActiveStatus(a.status);
    const bActive = isActiveStatus(b.status);
    if (aActive !== bActive) return aActive ? -1 : 1;
    return new Date(b.createdat).getTime() - new Date(a.createdat).getTime();
  });

  const activeWorklists = sortedFilteredWorklists.filter((w) => isActiveStatus(w.status));
  const doneWorklists = sortedFilteredWorklists.filter((w) => isDoneStatus(w.status));

  // Delete worklist item mutation
  const deleteWorklistItemMutation = useMutation({
    mutationFn: async ({ worklistid, worklistitemid }: { worklistid: string; worklistitemid: string }) => {
      const response = await fetch(`/api/lims/worklists/${worklistid}/items?worklistitemid=${worklistitemid}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklist-items', selectedWorklist?.worklistid] });
      queryClient.invalidateQueries({ queryKey: ['worklists', workspaceid] });
      queryClient.invalidateQueries({ queryKey: ['accessioned-samples', workspaceid] });
    },
    onError: (error: Error) => {
      setAlertDialog({ show: true, title: 'Error', message: `Failed to delete item: ${error.message}` });
    },
  });

  // Delete worklist mutation
  const deleteWorklistMutation = useMutation({
    mutationFn: async (worklistid: string) => {
      const response = await fetch(`/api/lims/worklists?worklistid=${worklistid}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete worklist');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklists', workspaceid] });
      setShowWorklistDetail(false);
      setSelectedWorklist(null);
      setAlertDialog({ show: true, title: 'Success', message: 'Worklist deleted successfully' });
    },
    onError: (error: Error) => {
      setAlertDialog({ show: true, title: 'Error', message: `Failed to delete worklist: ${error.message}` });
    },
  });

  // Print worklist function
  const handlePrintWorklist = () => {
    if (!selectedWorklist || !worklistItems) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Worklist - ${selectedWorklist.worklistname}</title>
          <style>
            @media print {
              @page { margin: 0.5in; }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              font-size: 12px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .header h1 { margin: 0; font-size: 20px; }
            .header p { margin: 3px 0; color: #666; font-size: 11px; }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 20px;
              padding: 10px;
              background: #f5f5f5;
              border-radius: 5px;
            }
            .info-item { }
            .info-label { font-weight: bold; font-size: 10px; color: #666; }
            .info-value { font-size: 11px; margin-top: 2px; }
            .sample-card {
              border: 2px solid #333;
              margin-bottom: 20px;
              page-break-inside: avoid;
              background: white;
            }
            .sample-header {
              background: #4E95D9;
              color: white;
              padding: 8px 12px;
              font-weight: bold;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .sample-info {
              padding: 10px 12px;
              background: #f9f9f9;
              border-bottom: 1px solid #ddd;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px;
            }
            .sample-info-item {
              font-size: 11px;
            }
            .sample-info-label {
              font-weight: bold;
              color: #666;
            }
            .tests-section {
              padding: 12px;
            }
            .tests-title {
              font-weight: bold;
              margin-bottom: 10px;
              font-size: 12px;
              color: #333;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .test-row {
              display: grid;
              grid-template-columns: 40% 60%;
              border-bottom: 1px solid #eee;
              padding: 12px 0;
              min-height: 40px;
            }
            .test-row:last-child {
              border-bottom: none;
            }
            .test-name {
              font-weight: bold;
              padding-right: 10px;
            }
            .result-field {
              border-bottom: 1px solid #999;
              min-height: 25px;
              position: relative;
            }
            .result-label {
              position: absolute;
              top: -15px;
              left: 0;
              font-size: 9px;
              color: #999;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${selectedWorklist.worklistname}</h1>
            <p>${selectedWorklist.department} | Priority: ${selectedWorklist.priority.toUpperCase()}</p>
            <p>Created: ${new Date(selectedWorklist.createdat).toLocaleDateString()} | Total Samples: ${worklistItems.length}</p>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Status</div>
              <div class="info-value">${selectedWorklist.status.toUpperCase()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Created By</div>
              <div class="info-value">${selectedWorklist.createdbyname || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Assigned To</div>
              <div class="info-value">${selectedWorklist.assignedtoname || 'Unassigned'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Print Date</div>
              <div class="info-value">${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          ${worklistItems.map(item => {
            const tests = Array.isArray(item.tests) ? item.tests : [];
            return `
              <div class="sample-card">
                <div class="sample-header">
                  <span>Sample: ${item.samplenumber}</span>
                  <span>${item.sampletype}</span>
                </div>
                <div class="sample-info">
                  <div class="sample-info-item">
                    <span class="sample-info-label">Accession #:</span> ${item.accessionnumber || '-'}
                  </div>
                  <div class="sample-info-item">
                    <span class="sample-info-label">Status:</span> ${item.status}
                  </div>
                  <div class="sample-info-item">
                    <span class="sample-info-label">Added:</span> ${new Date(item.addedat).toLocaleDateString()}
                  </div>
                  <div class="sample-info-item">
                    <span class="sample-info-label">Added By:</span> ${item.addedbyname || '-'}
                  </div>
                </div>
                <div class="tests-section">
                  <div class="tests-title">Tests & Results (${tests.length} tests)</div>
                  ${tests.length > 0 ? tests.map(test => `
                    <div class="test-row">
                      <div class="test-name">${test}</div>
                      <div class="result-field">
                        <div class="result-label">Result:</div>
                      </div>
                    </div>
                  `).join('') : '<div style="padding: 10px; color: #999;">No tests specified</div>'}
                </div>
              </div>
            `;
          }).join('')}

          <div class="footer">
            <p>Tibbna-LIMs - Laboratory Information Management System</p>
            <p>Printed on ${new Date().toLocaleString()}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 100);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Assign worklist mutation
  const assignWorklistMutation = useMutation({
    mutationFn: async ({ worklistid, assignedtoname }: { worklistid: string; assignedtoname: string }) => {
      const response = await fetch('/api/lims/worklists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worklistid,
          assignedtoname,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign worklist');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklists', workspaceid] });
      setShowAssignDialog(false);
      setAssignToName('');
    },
    onError: (error: Error) => {
      setAlertDialog({ show: true, title: 'Error', message: `Failed to assign worklist: ${error.message}` });
    },
  });

  // Create worklist mutation
  const createWorklistMutation = useMutation({
    mutationFn: async (data: typeof worklistFormData) => {
      const response = await fetch('/api/lims/worklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worklistname: data.worklistname,
          worklisttype: 'department',
          department: data.laboratory,
          description: data.description,
          priority: data.priority,
          workspaceId: workspaceid,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create worklist');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklists', workspaceid] });
      setShowCreateWorklistDialog(false);
      setWorklistFormData({ worklistname: '', laboratory: '', description: '', priority: 'routine' });
    },
    onError: (error: Error) => {
      setAlertDialog({ show: true, title: 'Error', message: `Failed to create worklist: ${error.message}` });
    },
  });

  // Edit worklist mutation
  const editWorklistMutation = useMutation({
    mutationFn: async (data: typeof editWorklistFormData & { worklistid: string }) => {
      const response = await fetch('/api/lims/worklists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update worklist');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklists', workspaceid] });
      setShowEditWorklistDialog(false);
      setEditWorklistFormData({ worklistname: '', department: '', description: '', priority: 'routine' });
      setAlertDialog({ show: true, title: 'Success', message: 'Worklist updated successfully!' });
    },
    onError: (error: Error) => {
      setAlertDialog({ show: true, title: 'Error', message: `Failed to update worklist: ${error.message}` });
    },
  });

  // Fetch worklist items when a worklist is selected
  const { data: worklistItems, isLoading: itemsLoading } = useQuery<WorklistItem[]>({
    queryKey: ['worklist-items', selectedWorklist?.worklistid],
    queryFn: async () => {
      if (!selectedWorklist) return [];
      const response = await fetch(`/api/lims/worklists/${selectedWorklist.worklistid}/items`);
      if (!response.ok) throw new Error('Failed to fetch worklist items');
      const data = await response.json();
      return data.items;
    },
    enabled: !!selectedWorklist,
  });

  // Fetch accessioned samples for adding/removing within a worklist
  const { data: accessionedSamples } = useQuery<any[]>({
    queryKey: ['accessioned-samples-for-worklist', workspaceid],
    queryFn: async () => {
      const response = await fetch(`/api/lims/accession?workspaceid=${workspaceid}&limit=200`);
      if (!response.ok) throw new Error('Failed to fetch accessioned samples');
      const data = await response.json();
      return data.samples || [];
    },
    enabled: showWorklistDetail,
  });

  const addWorklistItemMutation = useMutation({
    mutationFn: async ({ worklistid, sample }: { worklistid: string; sample: any }) => {
      const response = await fetch(`/api/lims/worklists/${worklistid}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleid: sample.sampleid,
          orderid: sample.orderid || null,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add sample to worklist');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklist-items', selectedWorklist?.worklistid] });
      queryClient.invalidateQueries({ queryKey: ['worklists', workspaceid] });
    },
    onError: (error: Error) => {
      setAlertDialog({ show: true, title: 'Error', message: `Failed to add sample: ${error.message}` });
    },
  });

  const existingSampleIds = new Set(
    (worklistItems || []).map((i) => String(i.sampleid)).filter(Boolean)
  );

  const normalizeCategory = (value: unknown) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const matchesWorklistDepartment = (sample: any) => {
    if (!selectedWorklist?.department) return true;
    const wlDept = normalizeCategory(selectedWorklist.department);
    const sampleCat = normalizeCategory(sample?.labcategory ?? sample?.labCategory);
    if (!sampleCat) return false;
    return sampleCat === wlDept;
  };

  const availableSamplesToAdd = (accessionedSamples || [])
    .filter((s: any) => matchesWorklistDepartment(s))
    .filter((s: any) => s?.sampleid && !existingSampleIds.has(String(s.sampleid)))
    .filter((s: any) => {
      const q = addSampleSearch.trim().toLowerCase();
      if (!q) return true;
      const patientName = String(s.patientname || '').toLowerCase();
      const sampleNo = String(s.samplenumber || '').toLowerCase();
      const accessionNo = String(s.accessionnumber || '').toLowerCase();
      return (
        patientName.includes(q) ||
        sampleNo.includes(q) ||
        accessionNo.includes(q)
      );
    })
    .slice(0, 25);

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-500",
      in_progress: "bg-blue-500",
      completed: "bg-green-500",
      cancelled: "bg-gray-500",
    };
    return (
      <Badge className={`${statusColors[status] || "bg-gray-500"} text-white`}>
        {status.replace(/_/g, " ").toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors: Record<string, string> = {
      stat: "bg-red-600",
      urgent: "bg-orange-500",
      routine: "bg-blue-500",
    };
    return (
      <Badge className={`${priorityColors[priority] || "bg-gray-500"} text-white`}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const handleEditWorklist = (worklist: Worklist) => {
    setEditWorklistFormData({
      worklistname: worklist.worklistname,
      department: worklist.department || '',
      description: worklist.description || '',
      priority: worklist.priority,
    });
    setSelectedWorklist(worklist);
    setShowEditWorklistDialog(true);
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold leading-tight">Worklists</h2>
          <p className="text-xs text-muted-foreground">
            Manage and organize samples for batch processing
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateWorklistDialog(true)}
          className="bg-[#4E95D9] hover:bg-[#3d7ab8] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Worklist
        </Button>
      </div>

      
      {/* Filters and Search */}
      <Card className="border-gray-200 flex-shrink-0">
        <CardContent className="px-3 py-2">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Worklist Name, Department, Created By, Assigned To..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as "active" | "done" | "all")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Start */}
            <div>
              <Input
                type="date"
                placeholder="Start date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Date Range End */}
            <div>
              <Input
                type="date"
                placeholder="End date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                className="w-full"
                min={dateRangeStart}
              />
            </div>

            <div className="flex items-center">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("active");
                  setDateRangeStart("");
                  setDateRangeEnd("");
                }}
                className="w-full"
                size="sm"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Worklists */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="py-2 px-3 flex-shrink-0 border-b">
          <CardTitle className="text-sm">Worklists</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-auto p-3 [&_[data-slot=table-container]]:overflow-visible">
          {worklistsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : sortedFilteredWorklists.length > 0 ? (
            <div className="space-y-8">
              {(statusFilter === 'active' || statusFilter === 'all') && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Active ({activeWorklists.length})</h3>
                  </div>
                  {activeWorklists.length > 0 ? (
                    <div>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Worklist Name</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Laboratory</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Priority</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Status</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Created By</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Assigned To</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Items</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Created</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeWorklists.map((worklist) => (
                            <TableRow key={worklist.worklistid} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{worklist.worklistname}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{worklist.department}</Badge>
                              </TableCell>
                              <TableCell>{getPriorityBadge(worklist.priority)}</TableCell>
                              <TableCell>{getStatusBadge(worklist.status)}</TableCell>
                              <TableCell className="text-sm">{worklist.createdbyname || '-'}</TableCell>
                              <TableCell className="text-sm">{worklist.assignedtoname || '-'}</TableCell>
                              <TableCell className="text-sm font-medium">{worklist.itemCount || 0}</TableCell>
                              <TableCell className="text-sm">
                                {new Date(worklist.createdat).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditWorklist(worklist)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-[#4E95D9] hover:bg-[#3d7ab8] text-white"
                                    onClick={() => {
                                      setSelectedWorklist(worklist);
                                      setShowWorklistDetail(true);
                                    }}
                                  >
                                    Open
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No active worklists found.</div>
                  )}
                </div>
              )}

              {(statusFilter === 'done' || statusFilter === 'all') && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Done ({doneWorklists.length})</h3>
                  </div>
                  {doneWorklists.length > 0 ? (
                    <div>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Worklist Name</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Laboratory</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Priority</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Status</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Created By</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Assigned To</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Items</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Created</TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {doneWorklists.map((worklist) => (
                            <TableRow key={worklist.worklistid} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{worklist.worklistname}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{worklist.department}</Badge>
                              </TableCell>
                              <TableCell>{getPriorityBadge(worklist.priority)}</TableCell>
                              <TableCell>{getStatusBadge(worklist.status)}</TableCell>
                              <TableCell className="text-sm">{worklist.createdbyname || '-'}</TableCell>
                              <TableCell className="text-sm">{worklist.assignedtoname || '-'}</TableCell>
                              <TableCell className="text-sm font-medium">{worklist.itemCount || 0}</TableCell>
                              <TableCell className="text-sm">
                                {new Date(worklist.createdat).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedWorklist(worklist);
                                      setShowWorklistDetail(true);
                                    }}
                                  >
                                    Open
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No done worklists found.</div>
                  )}
                </div>
              )}
            </div>
          ) : worklists && worklists.length > 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No worklists found matching your filters</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No worklists created yet</p>
              <p className="text-sm">Create worklists from the Sample Accessioning tab</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Worklist Detail Dialog */}
      <Dialog open={showWorklistDetail} onOpenChange={setShowWorklistDetail}>
        <DialogContent className="max-w-[65vw] max-h-[90vh] overflow-y-auto" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{selectedWorklist?.worklistname}</DialogTitle>
            <DialogDescription>
              {selectedWorklist?.department} • Created {selectedWorklist && new Date(selectedWorklist.createdat).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          {selectedWorklist ? (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditWorklist(selectedWorklist)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrintWorklist}
                  disabled={itemsLoading || !worklistItems}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>

              <div className="space-y-2">
                <div className="p-2 bg-gray-50 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Status:</span>
                      {getStatusBadge(selectedWorklist.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Priority:</span>
                      {getPriorityBadge(selectedWorklist.priority)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Created By:</span>
                      <span className="font-medium">{selectedWorklist.createdbyname || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Total Items:</span>
                      <span className="font-medium">{selectedWorklist.itemCount || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Assigned To:</span>
                      <span className="font-medium">{selectedWorklist.assignedtoname || 'Unassigned'}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAssignToName(selectedWorklist.assignedtoname || '');
                        setShowAssignDialog(true);
                      }}
                      className="h-6 text-xs px-2"
                    >
                      <User className="h-3 w-3 mr-1" />
                      {selectedWorklist.assignedtoname ? 'Reassign' : 'Assign'}
                    </Button>
                  </div>
                  {selectedWorklist.description && (
                    <div className="flex items-start gap-2 pt-1 border-t">
                      <span className="text-gray-600">Description:</span>
                      <span className="flex-1">{selectedWorklist.description}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">
                  Worklist Items ({worklistItems?.length || 0})
                </h3>

                {itemsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : worklistItems && worklistItems.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="w-[120px]">Sample #</TableHead>
                          <TableHead className="w-[140px]">Order ID</TableHead>
                          <TableHead className="w-[180px]">Tests</TableHead>
                          <TableHead className="w-[120px]">Sample Type</TableHead>
                          <TableHead className="w-[120px]">Added Date</TableHead>
                          <TableHead className="w-[100px]">Status</TableHead>
                          <TableHead className="w-[60px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {worklistItems.map((item) => (
                          <TableRow key={item.worklistitemid} className="text-xs">
                            <TableCell className="font-mono font-medium">{item.samplenumber}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {item.orderid ? (
                                <span className="text-blue-600" title={item.orderid}>
                                  ...{item.orderid.slice(-5)}
                                </span>
                              ) : item.openehrrequestid ? (
                                <span className="text-purple-600" title={item.openehrrequestid}>
                                  {item.openehrrequestid.length > 10 ? `...${item.openehrrequestid.slice(-5)}` : item.openehrrequestid}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="truncate max-w-[180px]" title={Array.isArray(item.tests) ? item.tests.join(', ') : '-'}>
                              {Array.isArray(item.tests) ? item.tests.join(', ') : '-'}
                            </TableCell>
                            <TableCell className="capitalize">{item.sampletype}</TableCell>
                            <TableCell>
                              {new Date(item.addedat).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                onClick={() => setDeleteConfirm({ show: true, item })}
                                disabled={deleteWorklistItemMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No samples in this worklist yet</p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex justify-between">
                <Button
                  variant="destructive"
                  onClick={() => setDeleteWorklistConfirm({ show: true, worklist: selectedWorklist })}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Worklist
                </Button>
                <Button variant="outline" onClick={() => setShowWorklistDetail(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Create Worklist Dialog */}
      <Dialog open={showCreateWorklistDialog} onOpenChange={setShowCreateWorklistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Worklist</DialogTitle>
            <DialogDescription>
              Create a new worklist for organizing samples by laboratory
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="worklistname">Worklist Name *</Label>
              <Input
                id="worklistname"
                placeholder="e.g., Hematology Morning Batch"
                value={worklistFormData.worklistname}
                onChange={(e) => setWorklistFormData({ ...worklistFormData, worklistname: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="laboratory">Laboratory/Department *</Label>
              <Select
                value={worklistFormData.laboratory}
                onValueChange={(value) => setWorklistFormData({ ...worklistFormData, laboratory: value })}
              >
                <SelectTrigger id="laboratory">
                  <SelectValue placeholder="Select laboratory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hematology">Hematology</SelectItem>
                  <SelectItem value="Biochemistry">Biochemistry</SelectItem>
                  <SelectItem value="Microbiology">Microbiology</SelectItem>
                  <SelectItem value="Immunology">Immunology</SelectItem>
                  <SelectItem value="Molecular">Molecular Biology</SelectItem>
                  <SelectItem value="Histopathology">Histopathology</SelectItem>
                  <SelectItem value="Cytology">Cytology</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select
                value={worklistFormData.priority}
                onValueChange={(value) => setWorklistFormData({ ...worklistFormData, priority: value })}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stat">STAT (Urgent)</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="routine">Routine</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description for this worklist"
                value={worklistFormData.description}
                onChange={(e) => setWorklistFormData({ ...worklistFormData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateWorklistDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!worklistFormData.worklistname || !worklistFormData.laboratory) {
                  setAlertDialog({ show: true, title: 'Validation Error', message: 'Please fill in required fields: Worklist Name and Laboratory' });
                  return;
                }
                createWorklistMutation.mutate(worklistFormData);
              }}
              disabled={createWorklistMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {createWorklistMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Create Worklist
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Worklist Dialog */}
      <Dialog open={showEditWorklistDialog} onOpenChange={setShowEditWorklistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Worklist</DialogTitle>
            <DialogDescription>
              Update worklist details for {selectedWorklist?.worklistname}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-worklistname">Worklist Name *</Label>
              <Input
                id="edit-worklistname"
                value={editWorklistFormData.worklistname}
                onChange={(e) => setEditWorklistFormData(prev => ({ ...prev, worklistname: e.target.value }))}
                placeholder="Enter worklist name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={editWorklistFormData.department}
                onChange={(e) => setEditWorklistFormData(prev => ({ ...prev, department: e.target.value }))}
                placeholder="e.g., Hematology, Biochemistry, Microbiology"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editWorklistFormData.description}
                onChange={(e) => setEditWorklistFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description of the worklist"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority *</Label>
              <Select
                value={editWorklistFormData.priority}
                onValueChange={(value) => setEditWorklistFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditWorklistDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editWorklistFormData.worklistname) {
                  setAlertDialog({ show: true, title: 'Validation Error', message: 'Please fill in required field: Worklist Name' });
                  return;
                }
                if (selectedWorklist) {
                  editWorklistMutation.mutate({
                    ...editWorklistFormData,
                    worklistid: selectedWorklist.worklistid,
                  });
                }
              }}
              disabled={editWorklistMutation.isPending}
              className="bg-[#4E95D9] hover:bg-[#3d7ab8] text-white"
            >
              {editWorklistMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Update Worklist
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to User Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Worklist to User</DialogTitle>
            <DialogDescription>
              Assign {selectedWorklist?.worklistname} to a lab technician
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assignto">Technician Name *</Label>
              <Input
                id="assignto"
                placeholder="Enter technician name"
                value={assignToName}
                onChange={(e) => setAssignToName(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Enter the name of the lab technician to assign this worklist to
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!assignToName.trim()) {
                  setAlertDialog({ show: true, title: 'Validation Error', message: 'Please enter a technician name' });
                  return;
                }
                if (selectedWorklist) {
                  assignWorklistMutation.mutate({
                    worklistid: selectedWorklist.worklistid,
                    assignedtoname: assignToName.trim(),
                  });
                }
              }}
              disabled={assignWorklistMutation.isPending}
              className="bg-[#4E95D9] hover:bg-[#3d7ab8] text-white"
            >
              {assignWorklistMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Assign Worklist
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Sample Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.show} onOpenChange={(open) => setDeleteConfirm({ show: open, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Sample from Worklist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteConfirm.item?.samplenumber}</strong> from this worklist? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm({ show: false, item: null })}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteConfirm.item && selectedWorklist) {
                  deleteWorklistItemMutation.mutate({
                    worklistid: selectedWorklist.worklistid,
                    worklistitemid: deleteConfirm.item.worklistitemid,
                  });
                  setDeleteConfirm({ show: false, item: null });
                }
              }}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Worklist Confirmation Dialog */}
      <AlertDialog open={deleteWorklistConfirm.show} onOpenChange={(open) => setDeleteWorklistConfirm({ show: open, worklist: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Worklist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteWorklistConfirm.worklist?.worklistname}</strong>? 
              This will remove the worklist and all its items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteWorklistConfirm({ show: false, worklist: null })}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteWorklistConfirm.worklist) {
                  deleteWorklistMutation.mutate(deleteWorklistConfirm.worklist.worklistid);
                  setDeleteWorklistConfirm({ show: false, worklist: null });
                }
              }}
              disabled={deleteWorklistMutation.isPending}
            >
              {deleteWorklistMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Worklist'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog for notifications */}
      <AlertDialog open={alertDialog.show} onOpenChange={(open) => setAlertDialog({ ...alertDialog, show: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setAlertDialog({ show: false, title: '', message: '' })}
              className="bg-blue-600 hover:bg-blue-700"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
