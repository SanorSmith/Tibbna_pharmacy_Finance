/**
 * Suppliers Management Component
 * 
 * Provides suppliers management interface with CRUD operations
 * Features suppliers listing, creation, editing, and deletion
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
import { Package, Plus, Edit, Trash2, Search, Star } from "lucide-react";

interface Supplier {
  supplierid: string;
  name: string;
  code: string;
  description?: string;
  phonenumber?: string;
  phonenumber2?: string;
  email?: string;
  email2?: string;
  website?: string;
  addressline1?: string;
  addressline2?: string;
  city?: string;
  state?: string;
  postalcode?: string;
  country?: string;
  taxid?: string;
  licensenumber?: string;
  establishedyear?: number;
  contactperson?: string;
  contacttitle?: string;
  contactphone?: string;
  contactemail?: string;
  category: string;
  type: string;
  specialization?: string;
  rating?: number;
  ispreferred: boolean;
  isactive: boolean;
  paymentterms?: string;
  creditlimit?: number;
  currency: string;
  supportphone?: string;
  supportemail?: string;
  technicalcontact?: string;
  notes?: string;
  contracturl?: string;
  catalogurl?: string;
  createdat: string;
  updatedat?: string;
}

interface SupplierFormData {
  name: string;
  code: string;
  description: string;
  phonenumber: string;
  email: string;
  addressline1: string;
  city: string;
  state: string;
  postalcode: string;
  country: string;
  contactperson: string;
  contacttitle: string;
  contactphone: string;
  contactemail: string;
  category: string;
  type: string;
  specialization: string;
  rating: string;
  ispreferred: boolean;
  isactive: boolean;
  paymentterms: string;
  currency: string;
  notes: string;
  website: string;
}

interface SuppliersManagementProps {
  workspaceid: string;
}

export default function SuppliersManagement({ workspaceid }: SuppliersManagementProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>({
    name: "",
    code: "",
    description: "",
    phonenumber: "",
    email: "",
    addressline1: "",
    city: "",
    state: "",
    postalcode: "",
    country: "",
    contactperson: "",
    contacttitle: "",
    contactphone: "",
    contactemail: "",
    category: "",
    type: "",
    specialization: "",
    rating: "",
    ispreferred: false,
    isactive: true,
    paymentterms: "",
    currency: "USD",
    notes: "",
    website: "",
  });

  // Fetch suppliers
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/d/${workspaceid}/suppliers${searchTerm ? `?search=${searchTerm}` : ""}`);
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.suppliers || []);
      } else {
        console.error("Failed to fetch suppliers");
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      console.error("Error fetching suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [workspaceid, searchTerm]);

  // Handle form input changes
  const handleInputChange = (field: keyof SupplierFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      phonenumber: "",
      email: "",
      addressline1: "",
      city: "",
      state: "",
      postalcode: "",
      country: "",
      contactperson: "",
      contacttitle: "",
      contactphone: "",
      contactemail: "",
      category: "",
      type: "",
      specialization: "",
      rating: "",
      ispreferred: false,
      isactive: true,
      paymentterms: "",
      currency: "USD",
      notes: "",
      website: "",
    });
  };

  // Handle add supplier
  const handleAddSupplier = async () => {
    try {
      const payload = {
        ...formData,
        rating: formData.rating ? parseFloat(formData.rating) : undefined,
      };

      const response = await fetch(`/api/d/${workspaceid}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Supplier added successfully");
        setIsAddDialogOpen(false);
        resetForm();
        fetchSuppliers();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add supplier");
      }
    } catch (error) {
      console.error("Error adding supplier:", error);
      alert("Error adding supplier");
    }
  };

  // Handle edit supplier
  const handleEditSupplier = async () => {
    if (!editingSupplier) return;

    try {
      const payload = {
        ...formData,
        rating: formData.rating ? parseFloat(formData.rating) : undefined,
      };

      const response = await fetch(`/api/d/${workspaceid}/suppliers/${editingSupplier.supplierid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Supplier updated successfully");
        setIsEditDialogOpen(false);
        setEditingSupplier(null);
        resetForm();
        fetchSuppliers();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update supplier");
      }
    } catch (error) {
      console.error("Error updating supplier:", error);
      alert("Error updating supplier");
    }
  };

  // Handle delete supplier
  const handleDeleteSupplier = async (supplierId: string) => {
    try {
      const response = await fetch(`/api/d/${workspaceid}/suppliers/${supplierId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Supplier deleted successfully");
        fetchSuppliers();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete supplier");
      }
    } catch (error) {
      console.error("Error deleting supplier:", error);
      alert("Error deleting supplier");
    }
  };

  // Open edit dialog
  const openEditDialog = (supplierItem: Supplier) => {
    setEditingSupplier(supplierItem);
    setFormData({
      name: supplierItem.name,
      code: supplierItem.code,
      description: supplierItem.description || "",
      phonenumber: supplierItem.phonenumber || "",
      email: supplierItem.email || "",
      addressline1: supplierItem.addressline1 || "",
      city: supplierItem.city || "",
      state: supplierItem.state || "",
      postalcode: supplierItem.postalcode || "",
      country: supplierItem.country || "",
      contactperson: supplierItem.contactperson || "",
      contacttitle: supplierItem.contacttitle || "",
      contactphone: supplierItem.contactphone || "",
      contactemail: supplierItem.contactemail || "",
      category: supplierItem.category,
      type: supplierItem.type,
      specialization: supplierItem.specialization || "",
      rating: supplierItem.rating?.toString() || "",
      ispreferred: supplierItem.ispreferred,
      isactive: supplierItem.isactive,
      paymentterms: supplierItem.paymentterms || "",
      currency: supplierItem.currency,
      notes: supplierItem.notes || "",
      website: supplierItem.website || "",
    });
    setIsEditDialogOpen(true);
  };

  // Get status badge color
  const getStatusBadge = (isactive: boolean, ispreferred: boolean) => {
    if (!isactive) {
      return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
    }
    if (ispreferred) {
      return <Badge className="bg-blue-100 text-blue-800">Preferred</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  // Render rating stars
  const renderRating = (rating?: number) => {
    if (!rating) return "-";
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Suppliers Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage laboratory suppliers and vendors
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
              <DialogDescription>
                Enter the supplier details below
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Supplier name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phonenumber">Phone Number</Label>
                <Input
                  id="phonenumber"
                  value={formData.phonenumber}
                  onChange={(e) => handleInputChange("phonenumber", e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressline1">Address</Label>
                <Input
                  id="addressline1"
                  value={formData.addressline1}
                  onChange={(e) => handleInputChange("addressline1", e.target.value)}
                  placeholder="Street address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  placeholder="State/Province"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddSupplier}>
                Save Supplier
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
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Suppliers List</CardTitle>
          <CardDescription>
            View and manage all laboratory suppliers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading suppliers...</div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No suppliers found</p>
              <p className="text-sm mt-2">Add your first supplier to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((item) => (
                  <TableRow key={item.supplierid}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        {item.ispreferred && (
                          <Star className="h-4 w-4 fill-blue-400 text-blue-400" />
                        )}
                        <span>{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.phonenumber || "-"}</TableCell>
                    <TableCell>{item.email || "-"}</TableCell>
                    <TableCell>
                      {[
                        item.addressline1,
                        item.city,
                        item.state,
                        item.postalcode
                      ].filter(Boolean).join(", ") || "-"}
                    </TableCell>
                    <TableCell>{renderRating(item.rating)}</TableCell>
                    <TableCell>{getStatusBadge(item.isactive, item.ispreferred)}</TableCell>
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
                                This will permanently delete the supplier "{item.name}".
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteSupplier(item.supplierid)}
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
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>
              Update the supplier details below
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Supplier name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phonenumber">Phone Number</Label>
              <Input
                id="edit-phonenumber"
                value={formData.phonenumber}
                onChange={(e) => handleInputChange("phonenumber", e.target.value)}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-addressline1">Address</Label>
              <Input
                id="edit-addressline1"
                value={formData.addressline1}
                onChange={(e) => handleInputChange("addressline1", e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-state">State</Label>
              <Input
                id="edit-state"
                value={formData.state}
                onChange={(e) => handleInputChange("state", e.target.value)}
                placeholder="State/Province"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSupplier}>
              Update Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
