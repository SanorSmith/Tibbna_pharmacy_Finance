"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, User as UserIcon, Edit, Save, X } from "lucide-react";
import { User } from "@/lib/db/tables/user";
import {
  Workspace,
  WorkspaceUserRole,
  WorkspaceUser,
  WorkspaceType,
} from "@/lib/db/tables/workspace";
import {
  addUserToWorkspaceAction,
  removeUserFromWorkspaceAction,
  updateWorkspaceAction,
  getWorkspaceUsersAction,
} from "../../actions";
import {
  WorkspaceIcon,
  getWorkspaceLabel,
} from "@/components/shared/workspace-icons";
import { useLanguage } from "@/hooks/use-language";

interface WorkspaceDetailModalProps {
  workspace: Workspace | null;
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
  onWorkspaceUpdate?: (workspace: Workspace) => void;
}

const roleColors = {
  doctor: "bg-blue-100 text-blue-800",
  nurse: "bg-green-100 text-green-800",
  lab_technician: "bg-purple-100 text-purple-800",
  pharmacist: "bg-orange-100 text-orange-800",
  receptionist: "bg-yellow-100 text-yellow-800",
  administrator: "bg-red-100 text-red-800",
};

const workspaceTypeColors = {
  hospital: "bg-red-100 text-red-800",
  laboratory: "bg-blue-100 text-blue-800",
  pharmacy: "bg-green-100 text-green-800",
};

type WorkspaceUserWithDetails = WorkspaceUser & { user: User };

export function WorkspaceDetailModal({
  workspace,
  isOpen,
  onClose,
  allUsers,
  onWorkspaceUpdate,
}: WorkspaceDetailModalProps) {
  const { ttt } = useLanguage();
  const [workspaceUsers, setWorkspaceUsers] = useState<
    WorkspaceUserWithDetails[]
  >([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState<WorkspaceUserRole>("doctor");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    type: "hospital" as WorkspaceType,
    description: "",
  });

  const loadWorkspaceUsers = async () => {
    if (!workspace) return;
    try {
      setLoading(true);
      const result = await getWorkspaceUsersAction(workspace.workspaceid);
      if (result.success && result.data) {
        setWorkspaceUsers(result.data);
      } else {
        console.error("Error loading workspace users:", result.error);
        setWorkspaceUsers([]);
      }
    } catch (error) {
      console.error("Error loading workspace users:", error);
      setWorkspaceUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspace && isOpen) {
      loadWorkspaceUsers();
      setEditForm({
        name: workspace.name,
        type: workspace.type,
        description: workspace.description || "",
      });
      setIsEditing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, isOpen]);

  const handleAddUser = async () => {
    if (!workspace || !selectedUser) return;

    const formData = new FormData();
    formData.append("workspaceid", workspace.workspaceid);
    formData.append("userid", selectedUser);
    formData.append("role", selectedRole);

    const result = await addUserToWorkspaceAction(formData);
    if (result.success) {
      setSelectedUser("");
      loadWorkspaceUsers();
    }
  };

  const handleRemoveUser = async (userid: string) => {
    if (!workspace) return;

    const formData = new FormData();
    formData.append("workspaceid", workspace.workspaceid);
    formData.append("userid", userid);

    const result = await removeUserFromWorkspaceAction(formData);
    if (result.success) {
      loadWorkspaceUsers();
    }
  };

  const handleEditWorkspace = async () => {
    if (!workspace) return;

    const formData = new FormData();
    formData.append("workspaceid", workspace.workspaceid);
    formData.append("name", editForm.name);
    formData.append("type", editForm.type);
    formData.append("description", editForm.description);

    const result = await updateWorkspaceAction(formData);
    if (result.success && result.data) {
      setIsEditing(false);
      onWorkspaceUpdate?.(result.data);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      name: workspace?.name || "",
      type: workspace?.type || "hospital",
      description: workspace?.description || "",
    });
  };

  const availableUsers = allUsers.filter(
    (user) => !workspaceUsers.some((wu) => wu.user.userid === user.userid)
  );

  if (!workspace) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:!max-w-[55vw] !max-w-[55vw] w-[55vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <WorkspaceIcon type={workspace.type} className="h-5 w-5" />
            <span>Workspace Details: {workspace.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Workspace Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Workspace Information</h3>
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
                  <Button size="sm" onClick={handleEditWorkspace}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </div>

            {!isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Name:</strong> {workspace.name}
                </div>
                <div>
                  <strong>Type:</strong>
                  <Badge
                    className={`ml-2 ${workspaceTypeColors[workspace.type]}`}
                  >
                    {getWorkspaceLabel(workspace.type, ttt)}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <strong>Description:</strong>{" "}
                  {workspace.description || "No description"}
                </div>
                <div>
                  <strong>Created:</strong>{" "}
                  {new Date(workspace.createdat).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-workspace-name">Name</Label>
                    <Input
                      id="edit-workspace-name"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Enter workspace name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-workspace-type">Type</Label>
                    <Select
                      value={editForm.type}
                      onValueChange={(value) =>
                        setEditForm((prev) => ({
                          ...prev,
                          type: value as WorkspaceType,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hospital">
                          {ttt("Hospital")}
                        </SelectItem>
                        <SelectItem value="laboratory">
                          {ttt("Laboratory")}
                        </SelectItem>
                        <SelectItem value="pharmacy">
                          {ttt("Pharmacy")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-workspace-description">
                    Description
                  </Label>
                  <Textarea
                    id="edit-workspace-description"
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Enter workspace description"
                    rows={3}
                  />
                </div>
                <div>
                  <strong>Created:</strong>{" "}
                  {new Date(workspace.createdat).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          {/* Add User */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Add User</h3>
            <div className="flex items-center space-x-2">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.userid} value={user.userid}>
                      {user.name || user.email} ({user.email})
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

              <Button onClick={handleAddUser} disabled={!selectedUser}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Workspace Users */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Users in Workspace</h3>
            <div className="border rounded-lg">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%]">User</TableHead>
                    <TableHead className="w-[45%]">Email</TableHead>
                    <TableHead className="w-[20%]">Role</TableHead>
                    <TableHead className="w-[10%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : workspaceUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        No users in this workspace
                      </TableCell>
                    </TableRow>
                  ) : (
                    workspaceUsers.map((workspaceUser) => (
                      <TableRow key={workspaceUser.user.userid}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <UserIcon className="h-4 w-4" />
                            <span>{workspaceUser.user.name || "No name"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="break-words">{workspaceUser.user.email}</TableCell>
                        <TableCell>
                          <Badge className={roleColors[workspaceUser.role]}>
                            {workspaceUser.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleRemoveUser(workspaceUser.user.userid)
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
