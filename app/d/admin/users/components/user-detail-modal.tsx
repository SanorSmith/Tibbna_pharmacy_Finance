"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Building2, Edit, Save, X } from "lucide-react";
import { User } from "@/lib/db/tables/user";
import {
  Workspace,
  WorkspaceUserRole,
  WorkspaceUser,
} from "@/lib/db/tables/workspace";
import {
  addUserToWorkspaceAction,
  removeUserFromWorkspaceAction,
  updateUserAction,
  getUserWorkspacesAction,
} from "../../actions";

interface UserDetailModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  allWorkspaces: Workspace[];
  onUserUpdate?: (user: User) => void;
}

const roleColors = {
  doctor: "bg-blue-100 text-blue-800",
  nurse: "bg-green-100 text-green-800",
  lab_technician: "bg-purple-100 text-purple-800",
  pharmacist: "bg-orange-100 text-orange-800",
  receptionist: "bg-yellow-100 text-yellow-800",
  administrator: "bg-red-100 text-red-800",
};

type UserWorkspaceWithDetails = WorkspaceUser & { workspace: Workspace };

export function UserDetailModal({
  user,
  isOpen,
  onClose,
  allWorkspaces,
  onUserUpdate,
}: UserDetailModalProps) {
  const [userWorkspaces, setUserWorkspaces] = useState<
    UserWorkspaceWithDetails[]
  >([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [selectedRole, setSelectedRole] = useState<WorkspaceUserRole>("doctor");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "" });

  const loadUserWorkspaces = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const result = await getUserWorkspacesAction(user.userid);
      if (result.success && result.data) {
        setUserWorkspaces(result.data);
      } else {
        console.error("Error loading user workspaces:", result.error);
        setUserWorkspaces([]);
      }
    } catch (error) {
      console.error("Error loading user workspaces:", error);
      setUserWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && isOpen) {
      loadUserWorkspaces();
      setEditForm({ name: user.name || "", email: user.email });
      setIsEditing(false);
    }
  }, [user, isOpen, loadUserWorkspaces]);

  const handleAddToWorkspace = async () => {
    if (!user || !selectedWorkspace) return;

    const formData = new FormData();
    formData.append("workspaceid", selectedWorkspace);
    formData.append("userid", user.userid);
    formData.append("role", selectedRole);

    const result = await addUserToWorkspaceAction(formData);
    if (result.success) {
      setSelectedWorkspace("");
      loadUserWorkspaces();
    }
  };

  const handleRemoveFromWorkspace = async (workspaceid: string) => {
    if (!user) return;

    const formData = new FormData();
    formData.append("workspaceid", workspaceid);
    formData.append("userid", user.userid);

    const result = await removeUserFromWorkspaceAction(formData);
    if (result.success) {
      loadUserWorkspaces();
    }
  };

  const handleEditUser = async () => {
    if (!user) return;

    const formData = new FormData();
    formData.append("userid", user.userid);
    formData.append("name", editForm.name);
    formData.append("email", editForm.email);

    const result = await updateUserAction(formData);
    if (result.success && result.data) {
      setIsEditing(false);
      onUserUpdate?.(result.data);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({ name: user?.name || "", email: user?.email || "" });
  };

  const availableWorkspaces = allWorkspaces.filter(
    (workspace) =>
      !userWorkspaces.some(
        (uw) => uw.workspace.workspaceid === workspace.workspaceid
      )
  );

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details: {user.name || user.email}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">User Information</h3>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleEditUser}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </div>

            {!isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Name:</strong> {user.name || "No name"}
                </div>
                <div>
                  <strong>Email:</strong> {user.email}
                </div>
                <div>
                  <strong>Created:</strong>{" "}
                  {new Date(user.createdat).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <strong>Created:</strong>{" "}
                  {new Date(user.createdat).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          {/* Add to Workspace */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Add to Workspace</h3>
            <div className="flex items-center space-x-2">
              <Select
                value={selectedWorkspace}
                onValueChange={setSelectedWorkspace}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  {availableWorkspaces.map((workspace) => (
                    <SelectItem
                      key={workspace.workspaceid}
                      value={workspace.workspaceid}
                    >
                      {workspace.name} ({workspace.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedRole}
                onValueChange={(value) =>
                  setSelectedRole(value as WorkspaceUserRole)
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="item-aligned">
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="lab_technician">Lab Technician</SelectItem>
                  <SelectItem value="pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                  <SelectItem value="administrator">Administrator</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleAddToWorkspace}
                disabled={!selectedWorkspace}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* User Workspaces */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Workspaces</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : userWorkspaces.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        User is not in any workspaces
                      </TableCell>
                    </TableRow>
                  ) : (
                    userWorkspaces.map((userWorkspace) => (
                      <TableRow key={userWorkspace.workspace.workspaceid}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4" />
                            <span>{userWorkspace.workspace.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge>{userWorkspace.workspace.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={roleColors[userWorkspace.role]}>
                            {userWorkspace.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleRemoveFromWorkspace(
                                userWorkspace.workspace.workspaceid
                              )
                            }
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
