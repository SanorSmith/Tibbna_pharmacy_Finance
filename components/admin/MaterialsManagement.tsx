/**
 * Materials Management Component
 * 
 * Provides materials management interface with CRUD operations
 * Features materials listing, creation, editing, and deletion
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
import { Beaker, Plus, Edit, Trash2, Search, AlertTriangle } from "lucide-react";

interface Material {
  materialid: string;
  name: string;
  code: string;
  description?: string;
  lotnumber: string;
  batchnumber?: string;
  manufacturedate?: string;
  expirydate?: string;
  supplierid?: string;
  suppliername: string;
  suppliernumber?: string;
  size?: string;
  unit: string;
  quantity: number;
  minquantity?: number;
  maxquantity?: number;
  storage: string;
  storagelocation?: string;
  storageconditions?: string;
  price?: number;
  totalcost?: number;
  currency: string;
  category: string;
  type: string;
  hazardlevel?: string;
  casnumber?: string;
  qualitygrade?: string;
  certificatenumber?: string;
  testrequired: boolean;
  status: string;
  isavailable: boolean;
  notes?: string;
  msdsurl?: string;
  specifications?: string;
  createdat: string;
  updatedat?: string;
}

interface MaterialFormData {
  name: string;
  code: string;
  description: string;
  lotnumber: string;
  batchnumber: string;
  manufacturedate: string;
  expirydate: string;
  suppliername: string;
  suppliernumber: string;
  size: string;
  unit: string;
  quantity: string;
  minquantity: string;
  maxquantity: string;
  storage: string;
  storagelocation: string;
  storageconditions: string;
  price: string;
  currency: string;
  category: string;
  type: string;
  hazardlevel: string;
  casnumber: string;
  qualitygrade: string;
  certificatenumber: string;
  testrequired: boolean;
  status: string;
  isavailable: boolean;
  notes: string;
  msdsurl: string;
  specifications: string;
}

interface MaterialsManagementProps {
  workspaceid: string;
}

export default function MaterialsManagement({ workspaceid }: MaterialsManagementProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState<MaterialFormData>({
    name: "",
    code: "",
    description: "",
    lotnumber: "",
    batchnumber: "",
    manufacturedate: "",
    expirydate: "",
    suppliername: "",
    suppliernumber: "",
    size: "",
    unit: "",
    quantity: "",
    minquantity: "",
    maxquantity: "",
    storage: "",
    storagelocation: "",
    storageconditions: "",
    price: "",
    currency: "USD",
    category: "",
    type: "",
    hazardlevel: "",
    casnumber: "",
    qualitygrade: "",
    certificatenumber: "",
    testrequired: false,
    status: "active",
    isavailable: true,
    notes: "",
    msdsurl: "",
    specifications: "",
  });

  // Fetch materials
  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/d/${workspaceid}/materials${searchTerm ? `?search=${searchTerm}` : ""}`);
      if (response.ok) {
        const data = await response.json();
        setMaterials(data.materials || []);
      } else {
        console.error("Failed to fetch materials");
      }
    } catch (error) {
      console.error("Error fetching materials:", error);
      console.error("Error fetching materials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [workspaceid, searchTerm]);

  // Handle form input changes
  const handleInputChange = (field: keyof MaterialFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      lotnumber: "",
      batchnumber: "",
      manufacturedate: "",
      expirydate: "",
      suppliername: "",
      suppliernumber: "",
      size: "",
      unit: "",
      quantity: "",
      minquantity: "",
      maxquantity: "",
      storage: "",
      storagelocation: "",
      storageconditions: "",
      price: "",
      currency: "USD",
      category: "",
      type: "",
      hazardlevel: "",
      casnumber: "",
      qualitygrade: "",
      certificatenumber: "",
      testrequired: false,
      status: "active",
      isavailable: true,
      notes: "",
      msdsurl: "",
      specifications: "",
    });
  };

  // Handle add material
  const handleAddMaterial = async () => {
    try {
      const payload = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        minquantity: formData.minquantity ? parseFloat(formData.minquantity) : undefined,
        maxquantity: formData.maxquantity ? parseFloat(formData.maxquantity) : undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
      };

      const response = await fetch(`/api/d/${workspaceid}/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Material added successfully");
        setIsAddDialogOpen(false);
        resetForm();
        fetchMaterials();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add material");
      }
    } catch (error) {
      console.error("Error adding material:", error);
      alert("Error adding material");
    }
  };

  // Handle edit material
  const handleEditMaterial = async () => {
    if (!editingMaterial) return;

    try {
      const payload = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        minquantity: formData.minquantity ? parseFloat(formData.minquantity) : undefined,
        maxquantity: formData.maxquantity ? parseFloat(formData.maxquantity) : undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
      };

      const response = await fetch(`/api/d/${workspaceid}/materials/${editingMaterial.materialid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Material updated successfully");
        setIsEditDialogOpen(false);
        setEditingMaterial(null);
        resetForm();
        fetchMaterials();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update material");
      }
    } catch (error) {
      console.error("Error updating material:", error);
      alert("Error updating material");
    }
  };

  // Handle delete material
  const handleDeleteMaterial = async (materialId: string) => {
    try {
      const response = await fetch(`/api/d/${workspaceid}/materials/${materialId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Material deleted successfully");
        fetchMaterials();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete material");
      }
    } catch (error) {
      console.error("Error deleting material:", error);
      alert("Error deleting material");
    }
  };

  // Open edit dialog
  const openEditDialog = (materialItem: Material) => {
    setEditingMaterial(materialItem);
    setFormData({
      name: materialItem.name,
      code: materialItem.code,
      description: materialItem.description || "",
      lotnumber: materialItem.lotnumber,
      batchnumber: materialItem.batchnumber || "",
      manufacturedate: materialItem.manufacturedate ? materialItem.manufacturedate.split('T')[0] : "",
      expirydate: materialItem.expirydate ? materialItem.expirydate.split('T')[0] : "",
      suppliername: materialItem.suppliername,
      suppliernumber: materialItem.suppliernumber || "",
      size: materialItem.size || "",
      unit: materialItem.unit,
      quantity: materialItem.quantity.toString(),
      minquantity: materialItem.minquantity?.toString() || "",
      maxquantity: materialItem.maxquantity?.toString() || "",
      storage: materialItem.storage,
      storagelocation: materialItem.storagelocation || "",
      storageconditions: materialItem.storageconditions || "",
      price: materialItem.price?.toString() || "",
      currency: materialItem.currency,
      category: materialItem.category,
      type: materialItem.type,
      hazardlevel: materialItem.hazardlevel || "",
      casnumber: materialItem.casnumber || "",
      qualitygrade: materialItem.qualitygrade || "",
      certificatenumber: materialItem.certificatenumber || "",
      testrequired: materialItem.testrequired,
      status: materialItem.status,
      isavailable: materialItem.isavailable,
      notes: materialItem.notes || "",
      msdsurl: materialItem.msdsurl || "",
      specifications: materialItem.specifications || "",
    });
    setIsEditDialogOpen(true);
  };

  // Get status badge color
  const getStatusBadge = (status: string, expirydate?: string) => {
    // Check if expired
    if (expirydate && new Date(expirydate) < new Date()) {
      return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
    }
    
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "quarantine":
        return <Badge className="bg-yellow-100 text-yellow-800">Quarantine</Badge>;
      case "discontinued":
        return <Badge className="bg-gray-100 text-gray-800">Discontinued</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  // Check if material is expiring soon (within 30 days)
  const isExpiringSoon = (expirydate?: string) => {
    if (!expirydate) return false;
    const expiry = new Date(expirydate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Materials Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage laboratory materials, reagents, and consumables
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Material</DialogTitle>
              <DialogDescription>
                Enter the material details below
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Material name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lotnumber">Lot Number</Label>
                <Input
                  id="lotnumber"
                  value={formData.lotnumber}
                  onChange={(e) => handleInputChange("lotnumber", e.target.value)}
                  placeholder="Lot number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suppliername">Supplier</Label>
                <Input
                  id="suppliername"
                  value={formData.suppliername}
                  onChange={(e) => handleInputChange("suppliername", e.target.value)}
                  placeholder="Supplier name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  value={formData.size}
                  onChange={(e) => handleInputChange("size", e.target.value)}
                  placeholder="e.g., 100ml, 50g"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storage">Storage</Label>
                <Input
                  id="storage"
                  value={formData.storage}
                  onChange={(e) => handleInputChange("storage", e.target.value)}
                  placeholder="e.g., 2-8°C, Room temp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange("price", e.target.value)}
                  placeholder="Unit price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expirydate">Expire Date</Label>
                <Input
                  id="expirydate"
                  type="date"
                  value={formData.expirydate}
                  onChange={(e) => handleInputChange("expirydate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  placeholder="Current quantity"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMaterial}>
                Save Material
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
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle>Materials List</CardTitle>
          <CardDescription>
            View and manage all laboratory materials
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading materials...</div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Beaker className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No materials found</p>
              <p className="text-sm mt-2">Add your first material to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Lot Nr</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Expire Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((item) => (
                  <TableRow key={item.materialid}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        {item.expirydate && isExpiringSoon(item.expirydate) && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span>{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.lotnumber}</TableCell>
                    <TableCell>{item.suppliername}</TableCell>
                    <TableCell>{item.size || "-"}</TableCell>
                    <TableCell>{item.storage}</TableCell>
                    <TableCell>
                      {item.price ? `${item.currency} ${item.price.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell>
                      {item.expirydate 
                        ? new Date(item.expirydate).toLocaleDateString()
                        : "-"
                      }
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status, item.expirydate)}</TableCell>
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
                                This will permanently delete the material "{item.name}" (Lot: {item.lotnumber}).
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteMaterial(item.materialid)}
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
            <DialogTitle>Edit Material</DialogTitle>
            <DialogDescription>
              Update the material details below
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Material name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lotnumber">Lot Number</Label>
              <Input
                id="edit-lotnumber"
                value={formData.lotnumber}
                onChange={(e) => handleInputChange("lotnumber", e.target.value)}
                placeholder="Lot number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-suppliername">Supplier</Label>
              <Input
                id="edit-suppliername"
                value={formData.suppliername}
                onChange={(e) => handleInputChange("suppliername", e.target.value)}
                placeholder="Supplier name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-size">Size</Label>
              <Input
                id="edit-size"
                value={formData.size}
                onChange={(e) => handleInputChange("size", e.target.value)}
                placeholder="e.g., 100ml, 50g"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-storage">Storage</Label>
              <Input
                id="edit-storage"
                value={formData.storage}
                onChange={(e) => handleInputChange("storage", e.target.value)}
                placeholder="e.g., 2-8°C, Room temp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">Price</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                placeholder="Unit price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-expirydate">Expire Date</Label>
              <Input
                id="edit-expirydate"
                type="date"
                value={formData.expirydate}
                onChange={(e) => handleInputChange("expirydate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => handleInputChange("quantity", e.target.value)}
                placeholder="Current quantity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditMaterial}>
              Update Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
