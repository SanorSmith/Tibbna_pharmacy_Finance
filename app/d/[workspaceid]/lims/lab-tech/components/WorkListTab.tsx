/**
 * Work-list Tab Component
 * - Displays current work queue for lab technician
 */
"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Calendar, Trash2, Eye } from "lucide-react";

interface WorkListItem {
  id: string;
  orderId: string;
  creator: string;
  dateTime: string;
  comment: string;
  status: 'pending' | 'in-progress' | 'completed';
  originalOrder?: {
    request_id?: string;
    patient_id?: string;
    patient_name?: string;
    service_name?: string;
    requesting_provider?: string;
    urgency?: string;
    recorded_time?: string;
    patient_age?: string;
    patient_gender?: string;
    clinical_indication?: string;
    narrative?: string;
  };
}

export default function WorkListTab({ workspaceid: _workspaceid }: { workspaceid: string }) {
  const [workListItems, setWorkListItems] = useState<WorkListItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<WorkListItem['originalOrder'] | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);

  // Load worklist items from localStorage on component mount
  useEffect(() => {
    const savedWorklist = JSON.parse(localStorage.getItem('labWorklist') || '[]');
    setWorkListItems(savedWorklist);
  }, []);

  // Listen for storage changes to update in real-time
  useEffect(() => {
    const handleStorageChange = () => {
      const savedWorklist = JSON.parse(localStorage.getItem('labWorklist') || '[]');
      setWorkListItems(savedWorklist);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'in-progress':
        return <Badge variant="default" className="flex items-center gap-1 bg-blue-500">In Progress</Badge>;
      case 'completed':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-500">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRemoveItem = (id: string) => {
    const updatedList = workListItems.filter(item => item.id !== id);
    setWorkListItems(updatedList);
    localStorage.setItem('labWorklist', JSON.stringify(updatedList));
  };

  const handleViewOrder = (item: WorkListItem) => {
    setSelectedOrder(item.originalOrder);
    setIsOrderDetailsOpen(true);
  };

  const handleClearCompleted = () => {
    const updatedList = workListItems.filter(item => item.status !== 'completed');
    setWorkListItems(updatedList);
    localStorage.setItem('labWorklist', JSON.stringify(updatedList));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Work-list</CardTitle>
            <CardDescription>Your current work queue and assigned tasks</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {workListItems.length} items
            </Badge>
            <Button variant="outline" size="sm" onClick={handleClearCompleted}>
              Clear Completed
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {workListItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No items in your work-list.</p>
            <p className="text-sm mt-2">Assigned tasks will appear here when you add orders from the Orders tab.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-semibold">Worklist Nr</TableHead>
                  <TableHead className="font-semibold">Order ID</TableHead>
                  <TableHead className="font-semibold">Date and Time</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workListItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-blue-600">
                      {item.id}
                    </TableCell>
                    <TableCell className="font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline" onClick={() => handleViewOrder(item)}>
                      {item.orderId}
                    </TableCell>
                    <TableCell className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {item.dateTime}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewOrder(item)}
                          className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                          title="View order details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                          title="Remove from worklist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

      {/* Order Details Modal */}
      <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
        <DialogContent className="max-w-[65vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Detailed information about the lab order.
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
                  <div className="text-sm font-medium text-muted-foreground">Urgency</div>
                  <div className="text-base font-semibold">
                    {selectedOrder.urgency === 'routine' && <Badge variant="secondary">Routine</Badge>}
                    {selectedOrder.urgency === 'urgent' && <Badge variant="default" className="bg-orange-500">Urgent</Badge>}
                    {selectedOrder.urgency === 'stat' && <Badge variant="destructive">Stat</Badge>}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Order Date</div>
                  <div className="text-base font-semibold">{selectedOrder.recorded_time ? new Date(selectedOrder.recorded_time).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Age/Gender</div>
                  <div className="text-base font-semibold">
                    {selectedOrder.patient_age || 'N/A'} / {selectedOrder.patient_gender || 'N/A'}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Clinical Indication</div>
                <div className="text-base p-3 bg-gray-50 rounded-md">
                  {selectedOrder.clinical_indication}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Comment / Narrative</div>
                <div className="text-base p-3 bg-gray-50 rounded-md">
                  {selectedOrder.narrative || 'No additional comments'}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOrderDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </CardContent>
    </Card>
  );
}
