/**
 * Equipment Management Component
 * 
 * Provides equipment management interface with CRUD operations
 * Features equipment listing, creation, editing, and deletion
 */

"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Wrench, Plus, Edit, Trash2, Search, Filter } from "lucide-react";

interface Equipment {
  equipmentid: string;
  model: string;
  equipmentidcode: string;
  serialnumber: string;
  vendor: string;
  vendoremail?: string;
  vendorphone?: string;
  lastservicedate?: string;
  nextservicedate?: string;
  serviceinterval?: number;
  warrantyexpiry?: string;
  category: string;
  type: string;
  status: string;
  location?: string;
  calibrationdate?: string;
  nextcalibrationdate?: string;
  calibrationinterval?: number;
  purchaseprice?: number;
  currentvalue?: number;
  notes?: string;
  manualurl?: string;
  specifications?: string;
  createdat: string;
  updatedat?: string;
}

interface EquipmentFormData {
  model: string;
  equipmentidcode: string;
  serialnumber: string;
  vendor: string;
  vendoremail: string;
  vendorphone: string;
  lastservicedate: string;
  nextservicedate: string;
  serviceinterval: string;
  warrantyexpiry: string;
  category: string;
  type: string;
  status: string;
  location: string;
  calibrationdate: string;
  nextcalibrationdate: string;
  calibrationinterval: string;
  purchaseprice: string;
  currentvalue: string;
  notes: string;
  manualurl: string;
  specifications: string;
}

interface EquipmentManagementProps {
  workspaceid: string;
}

export default function EquipmentManagement({ workspaceid }: EquipmentManagementProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState<EquipmentFormData>({
    model: "",
    equipmentidcode: "",
    serialnumber: "",
    vendor: "",
    vendoremail: "",
    vendorphone: "",
    lastservicedate: "",
    nextservicedate: "",
    serviceinterval: "",
    warrantyexpiry: "",
    category: "",
    type: "",
    status: "active",
    location: "",
    calibrationdate: "",
    nextcalibrationdate: "",
    calibrationinterval: "",
    purchaseprice: "",
    currentvalue: "",
    notes: "",
    manualurl: "",
    specifications: "",
  });

  // Fetch equipment
  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/d/${workspaceid}/equipment${searchTerm ? `?search=${searchTerm}` : ""}`);
      if (response.ok) {
        const data = await response.json();
        setEquipment(data.equipment || []);
      } else {
        console.error("Failed to fetch equipment");
      }
    } catch (error) {
      console.error("Error fetching equipment:", error);
      console.error("Error fetching equipment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, [workspaceid, searchTerm]);

  // Handle form input changes
  const handleInputChange = (field: keyof EquipmentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      model: "",
      equipmentidcode: "",
      serialnumber: "",
      vendor: "",
      vendoremail: "",
      vendorphone: "",
      lastservicedate: "",
      nextservicedate: "",
      serviceinterval: "",
      warrantyexpiry: "",
      category: "",
      type: "",
      status: "active",
      location: "",
      calibrationdate: "",
      nextcalibrationdate: "",
      calibrationinterval: "",
      purchaseprice: "",
      currentvalue: "",
      notes: "",
      manualurl: "",
      specifications: "",
    });
  };

  // Handle add equipment
  const handleAddEquipment = async () => {
    try {
      const payload = {
        ...formData,
        serviceinterval: formData.serviceinterval ? parseInt(formData.serviceinterval) : undefined,
        calibrationinterval: formData.calibrationinterval ? parseInt(formData.calibrationinterval) : undefined,
        purchaseprice: formData.purchaseprice ? parseFloat(formData.purchaseprice) : undefined,
        currentvalue: formData.currentvalue ? parseFloat(formData.currentvalue) : undefined,
      };

      const response = await fetch(`/api/d/${workspaceid}/equipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Equipment added successfully");
        setIsAddDialogOpen(false);
        resetForm();
        fetchEquipment();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add equipment");
      }
    } catch (error) {
      console.error("Error adding equipment:", error);
      alert("Error adding equipment");
    }
  };

  // Handle edit equipment
  const handleEditEquipment = async () => {
    if (!editingEquipment) return;

    try {
      const payload = {
        ...formData,
        serviceinterval: formData.serviceinterval ? parseInt(formData.serviceinterval) : undefined,
        calibrationinterval: formData.calibrationinterval ? parseInt(formData.calibrationinterval) : undefined,
        purchaseprice: formData.purchaseprice ? parseFloat(formData.purchaseprice) : undefined,
        currentvalue: formData.currentvalue ? parseFloat(formData.currentvalue) : undefined,
      };

      const response = await fetch(`/api/d/${workspaceid}/equipment/${editingEquipment.equipmentid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Equipment updated successfully");
        setIsEditDialogOpen(false);
        setEditingEquipment(null);
        resetForm();
        fetchEquipment();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update equipment");
      }
    } catch (error) {
      console.error("Error updating equipment:", error);
      alert("Error updating equipment");
    }
  };

  // Handle delete equipment
  const handleDeleteEquipment = async (equipmentId: string) => {
    try {
      const response = await fetch(`/api/d/${workspaceid}/equipment/${equipmentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Equipment deleted successfully");
        fetchEquipment();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete equipment");
      }
    } catch (error) {
      console.error("Error deleting equipment:", error);
      alert("Error deleting equipment");
    }
  };

  // Open edit dialog
  const openEditDialog = (equipmentItem: Equipment) => {
    setEditingEquipment(equipmentItem);
    setFormData({
      model: equipmentItem.model,
      equipmentidcode: equipmentItem.equipmentidcode,
      serialnumber: equipmentItem.serialnumber,
      vendor: equipmentItem.vendor,
      vendoremail: equipmentItem.vendoremail || "",
      vendorphone: equipmentItem.vendorphone || "",
      lastservicedate: equipmentItem.lastservicedate ? equipmentItem.lastservicedate.split('T')[0] : "",
      nextservicedate: equipmentItem.nextservicedate ? equipmentItem.nextservicedate.split('T')[0] : "",
      serviceinterval: equipmentItem.serviceinterval?.toString() || "",
      warrantyexpiry: equipmentItem.warrantyexpiry ? equipmentItem.warrantyexpiry.split('T')[0] : "",
      category: equipmentItem.category,
      type: equipmentItem.type,
      status: equipmentItem.status,
      location: equipmentItem.location || "",
      calibrationdate: equipmentItem.calibrationdate ? equipmentItem.calibrationdate.split('T')[0] : "",
      nextcalibrationdate: equipmentItem.nextcalibrationdate ? equipmentItem.nextcalibrationdate.split('T')[0] : "",
      calibrationinterval: equipmentItem.calibrationinterval?.toString() || "",
      purchaseprice: equipmentItem.purchaseprice?.toString() || "",
      currentvalue: equipmentItem.currentvalue?.toString() || "",
      notes: equipmentItem.notes || "",
      manualurl: equipmentItem.manualurl || "",
      specifications: equipmentItem.specifications || "",
    });
    setIsEditDialogOpen(true);
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "maintenance":
        return <Badge className="bg-yellow-100 text-yellow-800">Maintenance</Badge>;
      case "decommissioned":
        return <Badge className="bg-red-100 text-red-800">Decommissioned</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Equipment Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage laboratory equipment and instruments
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Equipment</DialogTitle>
              <DialogDescription>
                Enter the equipment details below
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => handleInputChange("model", e.target.value)}
                  placeholder="Equipment model"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="equipmentidcode">Equipment ID</Label>
                <Input
                  id="equipmentidcode"
                  value={formData.equipmentidcode}
                  onChange={(e) => handleInputChange("equipmentidcode", e.target.value)}
                  placeholder="Equipment ID code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialnumber">Serial Number</Label>
                <Input
                  id="serialnumber"
                  value={formData.serialnumber}
                  onChange={(e) => handleInputChange("serialnumber", e.target.value)}
                  placeholder="Serial number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Input
                  id="vendor"
                  value={formData.vendor}
                  onChange={(e) => handleInputChange("vendor", e.target.value)}
                  placeholder="Vendor name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastservicedate">Last Service</Label>
                <Input
                  id="lastservicedate"
                  type="date"
                  value={formData.lastservicedate}
                  onChange={(e) => handleInputChange("lastservicedate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextservicedate">Next Service</Label>
                <Input
                  id="nextservicedate"
                  type="date"
                  value={formData.nextservicedate}
                  onChange={(e) => handleInputChange("nextservicedate", e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEquipment}>
                Save Equipment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Equipment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment List</CardTitle>
          <CardDescription>
            View and manage all laboratory equipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading equipment...</div>
          ) : equipment.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No equipment found</p>
              <p className="text-sm mt-2">Add your first equipment to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Serial Nr</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Last Service</TableHead>
                  <TableHead>Next Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((item) => (
                  <TableRow key={item.equipmentid}>
                    <TableCell className="font-medium">{item.model}</TableCell>
                    <TableCell>{item.equipmentidcode}</TableCell>
                    <TableCell>{item.serialnumber}</TableCell>
                    <TableCell>{item.vendor}</TableCell>
                    <TableCell>
                      {item.lastservicedate 
                        ? new Date(item.lastservicedate).toLocaleDateString()
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      {item.nextservicedate 
                        ? new Date(item.nextservicedate).toLocaleDateString()
                        : "-"
                      }
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the equipment "{item.model}" ({item.equipmentidcode}).
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteEquipment(item.equipmentid)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Equipment</DialogTitle>
            <DialogDescription>
              Update the equipment details below
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-model">Model</Label>
              <Input
                id="edit-model"
                value={formData.model}
                onChange={(e) => handleInputChange("model", e.target.value)}
                placeholder="Equipment model"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-equipmentidcode">Equipment ID</Label>
              <Input
                id="edit-equipmentidcode"
                value={formData.equipmentidcode}
                onChange={(e) => handleInputChange("equipmentidcode", e.target.value)}
                placeholder="Equipment ID code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-serialnumber">Serial Number</Label>
              <Input
                id="edit-serialnumber"
                value={formData.serialnumber}
                onChange={(e) => handleInputChange("serialnumber", e.target.value)}
                placeholder="Serial number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-vendor">Vendor</Label>
              <Input
                id="edit-vendor"
                value={formData.vendor}
                onChange={(e) => handleInputChange("vendor", e.target.value)}
                placeholder="Vendor name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastservicedate">Last Service</Label>
              <Input
                id="edit-lastservicedate"
                type="date"
                value={formData.lastservicedate}
                onChange={(e) => handleInputChange("lastservicedate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nextservicedate">Next Service</Label>
              <Input
                id="edit-nextservicedate"
                type="date"
                value={formData.nextservicedate}
                onChange={(e) => handleInputChange("nextservicedate", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditEquipment}>
              Update Equipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
