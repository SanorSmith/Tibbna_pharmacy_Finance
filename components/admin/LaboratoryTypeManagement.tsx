/**
 * Laboratory Type Management Component
 * 
 * Provides laboratory type management interface with CRUD operations
 * Features laboratory type listing, creation, editing, and deletion
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
import { Building, Plus, Edit, Trash2, Search } from "lucide-react";

interface LaboratoryType {
  typeid: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  specialization?: string;
  parenttypeid?: string;
  sortorder: number;
  isactive: boolean;
  createdat: string;
  updatedat?: string;
}

interface LaboratoryTypeFormData {
  name: string;
  code: string;
  description: string;
  category: string;
  specialization: string;
  sortorder: string;
  isactive: boolean;
}

interface LaboratoryTypeManagementProps {
  workspaceid: string;
}

export default function LaboratoryTypeManagement({ workspaceid }: LaboratoryTypeManagementProps) {
  const [laboratoryTypes, setLaboratoryTypes] = useState<LaboratoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<LaboratoryType | null>(null);
  const [formData, setFormData] = useState<LaboratoryTypeFormData>({
    name: "",
    code: "",
    description: "",
    category: "",
    specialization: "",
    sortorder: "0",
    isactive: true,
  });

  // Fetch laboratory types
  const fetchLaboratoryTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/d/${workspaceid}/laboratory-types${searchTerm ? `?search=${searchTerm}` : ""}`);
      if (response.ok) {
        const data = await response.json();
        setLaboratoryTypes(data.laboratoryTypes || []);
      } else {
        console.error("Failed to fetch laboratory types");
      }
    } catch (error) {
      console.error("Error fetching laboratory types:", error);
      console.error("Error fetching laboratory types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaboratoryTypes();
  }, [workspaceid, searchTerm]);

  // Handle form input changes
  const handleInputChange = (field: keyof LaboratoryTypeFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      category: "",
      specialization: "",
      sortorder: "0",
      isactive: true,
    });
  };

  // Handle add laboratory type
  const handleAddLaboratoryType = async () => {
    try {
      const payload = {
        ...formData,
        sortorder: parseInt(formData.sortorder),
      };

      const response = await fetch(`/api/d/${workspaceid}/laboratory-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Laboratory type added successfully");
        setIsAddDialogOpen(false);
        resetForm();
        fetchLaboratoryTypes();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add laboratory type");
      }
    } catch (error) {
      console.error("Error adding laboratory type:", error);
      alert("Error adding laboratory type");
    }
  };

  // Handle edit laboratory type
  const handleEditLaboratoryType = async () => {
    if (!editingType) return;

    try {
      const payload = {
        ...formData,
        sortorder: parseInt(formData.sortorder),
      };

      const response = await fetch(`/api/d/${workspaceid}/laboratory-types/${editingType.typeid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Laboratory type updated successfully");
        setIsEditDialogOpen(false);
        setEditingType(null);
        resetForm();
        fetchLaboratoryTypes();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update laboratory type");
      }
    } catch (error) {
      console.error("Error updating laboratory type:", error);
      alert("Error updating laboratory type");
    }
  };

  // Handle delete laboratory type
  const handleDeleteLaboratoryType = async (typeId: string) => {
    try {
      const response = await fetch(`/api/d/${workspaceid}/laboratory-types/${typeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Laboratory type deleted successfully");
        fetchLaboratoryTypes();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete laboratory type");
      }
    } catch (error) {
      console.error("Error deleting laboratory type:", error);
      alert("Error deleting laboratory type");
    }
  };

  // Open edit dialog
  const openEditDialog = (typeItem: LaboratoryType) => {
    setEditingType(typeItem);
    setFormData({
      name: typeItem.name,
      code: typeItem.code,
      description: typeItem.description || "",
      category: typeItem.category,
      specialization: typeItem.specialization || "",
      sortorder: typeItem.sortorder.toString(),
      isactive: typeItem.isactive,
    });
    setIsEditDialogOpen(true);
  };

  // Get status badge color
  const getStatusBadge = (isactive: boolean) => {
    if (isactive) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Laboratory Type Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage laboratory types and specializations
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Laboratory Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Laboratory Type</DialogTitle>
              <DialogDescription>
                Enter the laboratory type details below
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., Immunology & Serology"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleInputChange("code", e.target.value)}
                  placeholder="e.g., IMM_SERO"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  placeholder="e.g., Clinical"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => handleInputChange("specialization", e.target.value)}
                  placeholder="e.g., Immunology"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddLaboratoryType}>
                Save Laboratory Type
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
            placeholder="Search laboratory types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Laboratory Types Table */}
      <Card>
        <CardHeader>
          <CardTitle>Laboratory Types</CardTitle>
          <CardDescription>
            View and manage all laboratory types and specializations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading laboratory types...</div>
          ) : laboratoryTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No laboratory types found</p>
              <p className="text-sm mt-2">Add your first laboratory type to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {laboratoryTypes.map((item) => (
                  <TableRow key={item.typeid}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.code}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.specialization || "-"}</TableCell>
                    <TableCell>{getStatusBadge(item.isactive)}</TableCell>
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
                                This will permanently delete the laboratory type "{item.name}".
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteLaboratoryType(item.typeid)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Laboratory Type</DialogTitle>
            <DialogDescription>
              Update the laboratory type details below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Immunology & Serology"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Code</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => handleInputChange("code", e.target.value)}
                placeholder="e.g., IMM_SERO"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                placeholder="e.g., Clinical"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-specialization">Specialization</Label>
              <Input
                id="edit-specialization"
                value={formData.specialization}
                onChange={(e) => handleInputChange("specialization", e.target.value)}
                placeholder="e.g., Immunology"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditLaboratoryType}>
              Update Laboratory Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
