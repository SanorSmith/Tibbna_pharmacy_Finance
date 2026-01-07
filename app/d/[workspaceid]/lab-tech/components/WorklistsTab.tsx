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
import { Loader2, ClipboardList, User, MapPin, Package, Plus, CheckCircle2, Trash2, Printer } from "lucide-react";

interface WorklistItem {
  worklistitemid: string;
  orderid: string;
  sampleid: string;
  samplenumber: string;
  sampletype: string;
  currentlocation: string;
  barcode: string;
  patientName: string;
  patientid: string;
  addedbyname: string;
  addedat: string;
  status: string;
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
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignToName, setAssignToName] = useState('');
  const [alertDialog, setAlertDialog] = useState<{ show: boolean; title: string; message: string }>({ show: false, title: '', message: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; item: WorklistItem | null }>({ show: false, item: null });
  const [worklistFormData, setWorklistFormData] = useState({
    worklistname: '',
    laboratory: '',
    description: '',
    priority: 'routine',
  });

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
    },
    onError: (error: Error) => {
      setAlertDialog({ show: true, title: 'Error', message: `Failed to delete item: ${error.message}` });
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
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; color: #666; }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
              padding: 15px;
              background: #f5f5f5;
              border-radius: 5px;
            }
            .info-item { }
            .info-label { font-weight: bold; font-size: 12px; color: #666; }
            .info-value { font-size: 14px; margin-top: 3px; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
              font-size: 12px;
            }
            th {
              background-color: #4E95D9;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 11px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${selectedWorklist.worklistname}</h1>
            <p>${selectedWorklist.department} | Priority: ${selectedWorklist.priority.toUpperCase()}</p>
            <p>Created: ${new Date(selectedWorklist.createdat).toLocaleDateString()} | Total Items: ${worklistItems.length}</p>
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

          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Sample Number</th>
                <th>Patient Name</th>
                <th>Sample Type</th>
                <th>Location</th>
                <th>Added By</th>
                <th>Added Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${worklistItems.map(item => `
                <tr>
                  <td>${item.orderid}</td>
                  <td>${item.samplenumber}</td>
                  <td>${item.patientName || item.patientid || '-'}</td>
                  <td>${item.sampletype}</td>
                  <td>${item.currentlocation}</td>
                  <td>${item.addedbyname || '-'}</td>
                  <td>${new Date(item.addedat).toLocaleDateString()}</td>
                  <td>${item.status.toUpperCase()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Laboratory Information Management System</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Worklists</h2>
          <p className="text-sm text-muted-foreground">
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Worklists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{worklists?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {worklists?.filter(w => w.status === 'pending').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {worklists?.filter(w => w.status === 'in_progress').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {worklists?.filter(w => w.status === 'completed').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Worklists Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Worklists</CardTitle>
          <CardDescription>Click on a worklist to view details and samples</CardDescription>
        </CardHeader>
        <CardContent>
          {worklistsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : worklists && worklists.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worklist Name</TableHead>
                    <TableHead>Laboratory</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {worklists.map((worklist) => (
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
                        <Button
                          size="sm"
                          className="bg-[#4E95D9] hover:bg-[#3d7ab8] text-white"
                          onClick={() => {
                            setSelectedWorklist(worklist);
                            setShowWorklistDetail(true);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
        <DialogContent className="!max-w-[98vw] w-[98vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedWorklist?.worklistname}</DialogTitle>
            <DialogDescription>
              {selectedWorklist?.department} • Created {selectedWorklist && new Date(selectedWorklist.createdat).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          {selectedWorklist && (
            <div className="space-y-6">
              {/* Worklist Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Status</div>
                    <div className="mt-1">{getStatusBadge(selectedWorklist.status)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Priority</div>
                    <div className="mt-1">{getPriorityBadge(selectedWorklist.priority)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Created By</div>
                    <div className="mt-1 font-medium">{selectedWorklist.createdbyname || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Items</div>
                    <div className="mt-1 font-medium">{selectedWorklist.itemCount || 0}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-gray-600 mb-2">Assigned To</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 font-medium">{selectedWorklist.assignedtoname || 'Unassigned'}</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAssignToName(selectedWorklist.assignedtoname || '');
                          setShowAssignDialog(true);
                        }}
                      >
                        <User className="h-3 w-3 mr-1" />
                        {selectedWorklist.assignedtoname ? 'Reassign' : 'Assign'}
                      </Button>
                    </div>
                  </div>
                  {selectedWorklist.description && (
                    <div className="col-span-2">
                      <div className="text-sm text-gray-600">Description</div>
                      <div className="mt-1">{selectedWorklist.description}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Worklist Items */}
              <div>
                <h3 className="font-semibold mb-3">Samples in Worklist</h3>
                {itemsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : worklistItems && worklistItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Sample Number</TableHead>
                          <TableHead>Patient Name</TableHead>
                          <TableHead>Sample Type</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Added By</TableHead>
                          <TableHead>Added Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {worklistItems.map((item) => (
                          <TableRow key={item.worklistitemid}>
                            <TableCell className="font-mono text-xs">{item.orderid}</TableCell>
                            <TableCell className="font-mono font-medium">{item.samplenumber}</TableCell>
                            <TableCell className="font-medium">{item.patientName || item.patientid || '-'}</TableCell>
                            <TableCell className="capitalize">{item.sampletype}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3 text-gray-500" />
                                {item.currentlocation}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-gray-500" />
                                {item.addedbyname || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(item.addedat).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setDeleteConfirm({ show: true, item });
                                }}
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
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={handlePrintWorklist}
              className="bg-[#4E95D9] hover:bg-[#3d7ab8] text-white"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Worklist
            </Button>
            <Button variant="outline" onClick={() => setShowWorklistDetail(false)}>
              Close
            </Button>
          </DialogFooter>
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

      {/* Delete Confirmation Dialog */}
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
            <AlertDialogAction onClick={() => setAlertDialog({ show: false, title: '', message: '' })}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
