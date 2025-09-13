"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Trash2, Building2 } from "lucide-react";
import { createWorkspaceAction, deleteWorkspaceAction } from "../actions";
import { Workspace } from "@/lib/db/tables/workspace";

const workspaceTypeColors = {
  hospital: "bg-red-100 text-red-800",
  laboratory: "bg-blue-100 text-blue-800",
  pharmacy: "bg-green-100 text-green-800",
};

interface WorkspaceManagementClientProps {
  initialWorkspaces: Workspace[];
}

export function WorkspaceManagementClient({ initialWorkspaces }: WorkspaceManagementClientProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filteredWorkspaces, setFilteredWorkspaces] = useState<Workspace[]>(initialWorkspaces);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredWorkspaces(workspaces);
      return;
    }
    
    const filtered = workspaces.filter(workspace => 
      workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workspace.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredWorkspaces(filtered);
  };

  const handleCreateWorkspace = async (formData: FormData) => {
    const result = await createWorkspaceAction(formData);
    if (result.success && result.data) {
      setIsCreateOpen(false);
      // Add new workspace to the state instead of reloading
      setWorkspaces(prev => [result.data, ...prev]);
      setFilteredWorkspaces(prev => [result.data, ...prev]);
    }
  };

  const handleDeleteWorkspace = async (workspaceid: string) => {
    if (!confirm("Are you sure you want to delete this workspace?")) return;
    
    const formData = new FormData();
    formData.append("workspaceid", workspaceid);
    
    const result = await deleteWorkspaceAction(formData);
    if (result.success) {
      // Remove workspace from state instead of reloading
      setWorkspaces(prev => prev.filter(workspace => workspace.workspaceid !== workspaceid));
      setFilteredWorkspaces(prev => prev.filter(workspace => workspace.workspaceid !== workspaceid));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="flex-1 flex items-center space-x-2">
          <Input
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
            </DialogHeader>
            <form action={handleCreateWorkspace} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="laboratory">Laboratory</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>
              <Button type="submit" className="w-full">
                Create Workspace
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWorkspaces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No workspaces found
                </TableCell>
              </TableRow>
            ) : (
              filteredWorkspaces.map((workspace) => (
                <TableRow key={workspace.workspaceid}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4" />
                      <span>{workspace.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={workspaceTypeColors[workspace.type]}>
                      {workspace.type.charAt(0).toUpperCase() + workspace.type.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {workspace.description || "No description"}
                  </TableCell>
                  <TableCell>{new Date(workspace.createdat).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteWorkspace(workspace.workspaceid)}
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
  );
}
