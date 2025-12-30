/**
 * Orders Tab Component
 * - Displays lab test orders with filters and search
 * - Fetches real data from openEHR via API
 */
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, Download, Eye, CheckCircle2, Clock, AlertCircle, Loader2, Plus } from "lucide-react";

interface LabOrder {
  composition_uid: string;
  recorded_time: string;
  service_name: string;
  clinical_indication: string;
  urgency: string;
  requesting_provider?: string;
  request_id?: string;
  patient_id: string;
  patient_name: string;
  patient_age: number | null;
  patient_gender: string | null;
  narrative?: string;
}

export default function OrdersTab({ workspaceid }: { workspaceid: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [newOrder, setNewOrder] = useState({
    patientId: '',
    firstName: '',
    middleName: '',
    lastName: '',
    labType: workspaceid,
    clinicalIndication: '',
    dateTime: new Date().toISOString().slice(0, 16),
    bodySite: '',
    specimenType: '',
    testGroup: '',
    testName: '',
    fasting: 'no',
    comment: '',
    urgency: 'routine'
  });

  // Test types from patient dashboard
  const testTypes = {
    "104177005": { code: "104177005", value: "Complete blood count (procedure)", name: "Complete Blood Count (CBC)", group: "Hematology" },
    "257051000": { code: "257051000", value: "Comprehensive metabolic panel", name: "Comprehensive Metabolic Panel", group: "Biochemistry" },
    "116276005": { code: "116276005", value: "Blood glucose measurement", name: "Blood Glucose Test", group: "Biochemistry" },
    "271749007": { code: "271749007", value: "Serum cholesterol measurement", name: "Serum Cholesterol Test", group: "Biochemistry" },
    "271658002": { code: "271658002", value: "Serum triglyceride measurement", name: "Serum Triglycerides Test", group: "Biochemistry" },
  };

  // Get unique test groups
  const testGroups = [...new Set(Object.values(testTypes).map(test => test.group))];

  // Fetch workspace info for department name
  const { data: workspaceData } = useQuery({
    queryKey: ['workspace', workspaceid],
    queryFn: async () => {
      const response = await fetch(`/api/d/${workspaceid}/workspace-info`);
      if (!response.ok) return null;
      return response.json();
    },
  });

  // Fetch lab orders from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['lab-orders', workspaceid],
    queryFn: async () => {
      const response = await fetch(`/api/d/${workspaceid}/lab-orders`);
      if (!response.ok) throw new Error('Failed to fetch lab orders');
      return response.json();
    },
  });

  const handleCreateOrder = async () => {
    try {
      const response = await fetch(`/api/d/${workspaceid}/lab-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newOrder),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create order');
      }
      
      // Reset form and close modal
      setNewOrder({
        patientId: '',
        firstName: '',
        middleName: '',
        lastName: '',
        labType: workspaceid,
        clinicalIndication: '',
        dateTime: new Date().toISOString().slice(0, 16),
        bodySite: '',
        specimenType: '',
        testGroup: '',
        testName: '',
        fasting: 'no',
        comment: '',
        urgency: 'routine'
      });
      setIsModalOpen(false);
      
      // Refetch orders to update the list
      // The query will automatically refetch due to React Query's cache invalidation
      window.location.reload();
    } catch (error) {
      console.error('Error creating order:', error);
      // You could add a toast notification here
    }
  };

  const handleOrderClick = (order: LabOrder) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleAddToWorklist = () => {
    if (selectedOrder) {
      const worklistItem = {
        id: `WL-${Date.now()}`,
        orderId: selectedOrder.request_id || 'N/A',
        creator: selectedOrder.requesting_provider || 'Unknown',
        dateTime: new Date().toLocaleString('en-US', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }).replace(',', ''),
        comment: `Lab order added to worklist`,
        status: 'pending' as const,
        originalOrder: selectedOrder
      };

      // Get existing worklist from localStorage or initialize empty array
      const existingWorklist = JSON.parse(localStorage.getItem('labWorklist') || '[]');
      const updatedWorklist = [...existingWorklist, worklistItem];
      
      // Save to localStorage
      localStorage.setItem('labWorklist', JSON.stringify(updatedWorklist));
      
      console.log('Added to worklist:', worklistItem);
      setIsDetailsModalOpen(false);
      
      // Show success message (you could add a toast notification here)
      alert('Order added to worklist successfully!');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'in-progress':
        return <Badge variant="default" className="flex items-center gap-1 bg-blue-500"><AlertCircle className="h-3 w-3" /> In Progress</Badge>;
      case 'completed':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-500"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyLower = urgency.toLowerCase();
    if (urgencyLower === 'urgent') {
      return <Badge variant="destructive" className="bg-red-600">Urgent</Badge>;
    }
    return <Badge variant="outline">Routine</Badge>;
  };

  const orders: LabOrder[] = data?.orders || [];

  const filteredOrders = orders.filter((order: LabOrder) => {
    const matchesSearch = order.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.request_id?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesUrgency = urgencyFilter === 'all' || order.urgency.toLowerCase() === urgencyFilter;
    
    return matchesSearch && matchesUrgency;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lab Orders</h2>
          <p className="text-sm text-muted-foreground mt-1">View and manage incoming lab test orders</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="border-gray-300"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#4E7BC7]"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Lab Order</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new laboratory test order.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                {/* Patient Information */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="patientId" className="text-right">
                    Patient ID
                  </Label>
                  <Input
                    id="patientId"
                    value={newOrder.patientId}
                    onChange={(e) => setNewOrder({...newOrder, patientId: e.target.value})}
                    className="col-span-3"
                    placeholder="Enter patient ID"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="firstName" className="text-right">
                    First name
                  </Label>
                  <Input
                    id="firstName"
                    value={newOrder.firstName}
                    onChange={(e) => setNewOrder({...newOrder, firstName: e.target.value})}
                    className="col-span-3"
                    placeholder="Enter first name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="middleName" className="text-right">
                    Middle name
                  </Label>
                  <Input
                    id="middleName"
                    value={newOrder.middleName}
                    onChange={(e) => setNewOrder({...newOrder, middleName: e.target.value})}
                    className="col-span-3"
                    placeholder="Enter middle name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="lastName" className="text-right">
                    Last name
                  </Label>
                  <Input
                    id="lastName"
                    value={newOrder.lastName}
                    onChange={(e) => setNewOrder({...newOrder, lastName: e.target.value})}
                    className="col-span-3"
                    placeholder="Enter last name"
                  />
                </div>
                
                {/* Lab Information */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="labType" className="text-right">
                    Lab type
                  </Label>
                  <Input
                    id="labType"
                    value={workspaceid}
                    disabled
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="clinicalIndication" className="text-right">
                    Clinical indication
                  </Label>
                  <Textarea
                    id="clinicalIndication"
                    value={newOrder.clinicalIndication}
                    onChange={(e) => setNewOrder({...newOrder, clinicalIndication: e.target.value})}
                    className="col-span-3"
                    placeholder="Enter clinical indication"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dateTime" className="text-right">
                    Date Time
                  </Label>
                  <Input
                    id="dateTime"
                    type="datetime-local"
                    value={newOrder.dateTime}
                    onChange={(e) => setNewOrder({...newOrder, dateTime: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="bodySite" className="text-right">
                    Body site
                  </Label>
                  <Input
                    id="bodySite"
                    value={newOrder.bodySite}
                    onChange={(e) => setNewOrder({...newOrder, bodySite: e.target.value})}
                    className="col-span-3"
                    placeholder="Enter body site"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="specimenType" className="text-right">
                    Specimen type
                  </Label>
                  <Select value={newOrder.specimenType} onValueChange={(value) => setNewOrder({...newOrder, specimenType: value})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select specimen type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blood">Blood</SelectItem>
                      <SelectItem value="urine">Urine</SelectItem>
                      <SelectItem value="serum">Serum</SelectItem>
                      <SelectItem value="plasma">Plasma</SelectItem>
                      <SelectItem value="swab">Swab</SelectItem>
                      <SelectItem value="tissue">Tissue</SelectItem>
                      <SelectItem value="fluid">Fluid</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Test Information */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="testGroup" className="text-right">
                    Test group
                  </Label>
                  <Select value={newOrder.testGroup} onValueChange={(value) => {
                    setNewOrder({...newOrder, testGroup: value, testName: ''});
                  }}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select test group" />
                    </SelectTrigger>
                    <SelectContent>
                      {testGroups.map(group => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="testName" className="text-right">
                    Test name
                  </Label>
                  <Select value={newOrder.testName} onValueChange={(value) => {
                    const selectedTest = Object.values(testTypes).find(test => test.name === value);
                    setNewOrder({...newOrder, testName: value, testGroup: selectedTest?.group || ''});
                  }}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select test name" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(testTypes).map(test => (
                        <SelectItem key={test.code} value={test.name}>{test.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fasting" className="text-right">
                    Fasting
                  </Label>
                  <Select value={newOrder.fasting} onValueChange={(value) => setNewOrder({...newOrder, fasting: value})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="urgency" className="text-right">
                    Urgency
                  </Label>
                  <Select value={newOrder.urgency} onValueChange={(value) => setNewOrder({...newOrder, urgency: value})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="stat">Stat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="comment" className="text-right">
                    comment
                  </Label>
                  <Textarea
                    id="comment"
                    value={newOrder.comment}
                    onChange={(e) => setNewOrder({...newOrder, comment: e.target.value})}
                    className="col-span-3"
                    placeholder="Enter additional comments"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  onClick={handleCreateOrder}
                  className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#4E7BC7]"
                >
                  Create Order
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="border-gray-200">
        <CardContent className="">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient, test type, or request ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div>
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgency</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="routine">Routine</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setUrgencyFilter('all');
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

      {/* Orders Table */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Orders ({filteredOrders.length})
            </CardTitle>
            {filteredOrders.length > 0 && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
              <span className="text-sm text-muted-foreground">Loading orders...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm text-destructive">Error loading orders. Please try again.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold">Order Nr</TableHead>
                    <TableHead className="font-semibold">Patient ID</TableHead>
                    <TableHead className="font-semibold">Test Type</TableHead>
                    <TableHead className="font-semibold">Physician ID</TableHead>
                    <TableHead className="font-semibold">Department ID</TableHead>
                    <TableHead className="font-semibold">Urgency</TableHead>
                    <TableHead className="font-semibold">Order Date</TableHead>
                    <TableHead className="font-semibold">Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <Clock className="h-12 w-12 text-gray-300 mb-3" />
                          <p className="text-sm font-medium text-gray-900">
                            {orders.length === 0 
                              ? "No lab orders found"
                              : "No orders match your filters"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {orders.length === 0 
                              ? "Orders will appear here when they are submitted."
                              : "Try adjusting your search or filters."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order: LabOrder) => (
                      <TableRow key={order.composition_uid} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline" onClick={() => handleOrderClick(order)}>
                          {order.request_id || 'N/A'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.patient_id?.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium">{order.service_name}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {order.requesting_provider || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {workspaceid?.substring(0, 8)}...
                        </TableCell>
                        <TableCell>{getUrgencyBadge(order.urgency)}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(order.recorded_time).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate text-sm text-gray-600" title={order.narrative || order.clinical_indication}>
                            {order.narrative || order.clinical_indication}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Test Order Details</DialogTitle>
            <DialogDescription>
              View detailed information about this lab test order.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Order Number</div>
                  <div className="text-base font-semibold">{selectedOrder.request_id || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Patient ID</div>
                  <div className="text-base font-semibold">{selectedOrder.patient_id?.substring(0, 8)}...</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Patient Name</div>
                  <div className="text-base font-semibold">{selectedOrder.patient_name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Test Type</div>
                  <div className="text-base font-semibold">{selectedOrder.service_name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Requesting Provider</div>
                  <div className="text-base font-semibold">{selectedOrder.requesting_provider || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Department ID</div>
                  <div className="text-base font-semibold">{workspaceid?.substring(0, 8)}...</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Urgency</div>
                  <div className="text-base font-semibold">{getUrgencyBadge(selectedOrder.urgency)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Order Date</div>
                  <div className="text-base font-semibold">{new Date(selectedOrder.recorded_time).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Age/Gender</div>
                  <div className="text-base font-semibold">
                    {selectedOrder.patient_age || 'N/A'} / {selectedOrder.patient_gender || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Clinical Indication</div>
                  <div className="text-base font-semibold">{selectedOrder.clinical_indication}</div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Comment / Narrative</div>
                <div className="text-base p-3 bg-gray-50 rounded-md">
                  {selectedOrder.narrative || selectedOrder.clinical_indication || 'No additional comments'}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
              Close
            </Button>
            <Button 
              type="button" 
              onClick={handleAddToWorklist}
              className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#4E7BC7]"
            >
              Add to Worklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
