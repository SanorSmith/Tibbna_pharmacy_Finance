/**
 * Todos List Client Component
 * - Display todos with edit/delete functionality
 * - Add new todos
 * - Mark as complete/incomplete
 */
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Home, Pencil, Trash2, Plus } from "lucide-react";
import Link from "next/link";

type Todo = {
  todoid: string;
  workspaceid: string;
  userid: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: string;
  duedate: string | null;
  createdat: string;
  updatedat: string;
};

type Props = {
  workspaceid: string;
  showHomeButton?: boolean;
};

export default function TodosList({ workspaceid, showHomeButton = true }: Props) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    duedate: "",
  });

  const { data: todos = [], isLoading: loading } = useQuery({
    queryKey: ["todos", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/todos`);
      if (res.ok) {
        const data = await res.json();
        return (data.todos as Todo[]) || [];
      }
      return [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch(`/api/d/${workspaceid}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create todo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos", workspaceid] });
      setShowAddDialog(false);
      setFormData({ title: "", description: "", priority: "medium", duedate: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Todo> }) => {
      const res = await fetch(`/api/d/${workspaceid}/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update todo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos", workspaceid] });
      setShowEditDialog(false);
      setEditingTodo(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/d/${workspaceid}/todos/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete todo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos", workspaceid] });
      setShowDeleteDialog(false);
      setDeletingTodo(null);
    },
  });

  const handleAddTodo = () => {
    if (!formData.title.trim()) return;
    createMutation.mutate(formData);
  };

  const handleEditTodo = () => {
    if (!editingTodo || !formData.title.trim()) return;
    updateMutation.mutate({ id: editingTodo.todoid, data: formData });
  };

  const handleToggleComplete = (todo: Todo) => {
    updateMutation.mutate({ id: todo.todoid, data: { completed: !todo.completed } });
  };

  const handleDeleteTodo = () => {
    if (!deletingTodo) return;
    deleteMutation.mutate(deletingTodo.todoid);
  };

  const openDeleteDialog = (todo: Todo) => {
    setDeletingTodo(todo);
    setShowDeleteDialog(true);
  };

  const openEditDialog = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description || "",
      priority: todo.priority,
      duedate: todo.duedate
        ? new Date(todo.duedate).toISOString().slice(0, 16)
        : "",
    });
    setShowEditDialog(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-200/90 text-red-800";
      case "medium":
        return "bg-yellow-200/90 text-yellow-800";
      case "low":
        return "bg-green-200/90 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const incompleteTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  return (
    <div className="space-y-4">
      {/* Back Button */}
    <div className="flex items-center justify-between">
  {/* Left side: icon + title */}
  <div className="flex items-center gap-3">
    {showHomeButton && (
      <Link href={`/d/${workspaceid}/doctor`}>
        <Button
          variant="outline"
          size="icon"
          aria-label="Back to Doctor Dashboard"
          className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
           >
          <Home className="h-4 w-4" />
        </Button>
      </Link>
    )}

    <h1 className="text-xl font-semibold">Todos</h1>
  </div>

  {/* Right side: Add button */}
  <Button
    onClick={() => setShowAddDialog(true)}
    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
  >
    <Plus className="h-4 w-4" />
    Add Todo
  </Button>
</div>



      {/* Todos List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            My Todo List ({incompleteTodos.length} active)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading todos...</p>
          ) : todos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No todos yet. Use the form to add tasks for today.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Incomplete Todos */}
              {incompleteTodos.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Active Tasks
                  </h3>
                  <ul className="space-y-2">
                    {incompleteTodos.map((todo) => (
                      <li
                        key={todo.todoid}
                        className="flex items-start justify-between gap-3 rounded border px-3 py-2 text-sm hover:bg-muted/50"
                      >
                        <div className="flex items-start gap-2 flex-1">
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => handleToggleComplete(todo)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 cursor-pointer"
                            aria-label="Mark todo as done"
                          />
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              {todo.title}
                              <span
                                className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(
                                  todo.priority
                                )}`}
                              >
                                {todo.priority}
                              </span>
                            </div>
                            {todo.description && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {todo.description}
                              </p>
                            )}
                            {todo.duedate && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Due: {formatDate(todo.duedate)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(todo)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteDialog(todo)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Completed Todos */}
              {completedTodos.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Completed ({completedTodos.length})
                  </h3>
                  <ul className="space-y-2">
                    {completedTodos.map((todo) => (
                      <li
                        key={todo.todoid}
                        className="flex items-start justify-between gap-3 rounded border px-3 py-2 text-sm bg-muted/30"
                      >
                        <div className="flex items-start gap-2 flex-1">
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => handleToggleComplete(todo)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 cursor-pointer"
                            aria-label="Mark todo as not done"
                          />
                          <div className="flex-1">
                            <div className="line-through text-muted-foreground">
                              {todo.title}
                            </div>
                            {todo.description && (
                              <p className="mt-1 text-xs text-muted-foreground line-through">
                                {todo.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteDialog(todo)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Todo Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Todo
            </DialogTitle>
            <DialogDescription>
              Create a new task for your todo list
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="add-title">
                Title *
              </label>
              <Input
                id="add-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g. Call patient about lab results"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="add-description">
                Details (optional)
              </label>
              <Textarea
                id="add-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                placeholder="Add clinical context, patient ID, or priority notes"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="add-priority">
                Priority
              </label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="add-duedate">
                Due Date (optional)
              </label>
              <Input
                id="add-duedate"
                type="datetime-local"
                value={formData.duedate}
                onChange={(e) =>
                  setFormData({ ...formData, duedate: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={createMutation.isPending}
              className="bg-blue-100/90 hover:bg-blue-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTodo}
              disabled={!formData.title.trim() || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 "
            >
              {createMutation.isPending ? "Adding..." : "Add Todo"}
              
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Todo Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[65vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Todo</DialogTitle>
            <DialogDescription>Update your todo details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="edit-title">
                Title *
              </label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Todo title"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="edit-description">
                Details
              </label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                placeholder="Add details..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="edit-priority">
                Priority
              </label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="edit-duedate">
                Due Date
              </label>
              <Input
                id="edit-duedate"
                type="datetime-local"
                value={formData.duedate}
                onChange={(e) =>
                  setFormData({ ...formData, duedate: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={updateMutation.isPending}
              className="bg-blue-100/90 hover:bg-blue-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditTodo}
              disabled={!formData.title.trim() || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Todo</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this todo? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          {deletingTodo && (
            <div className="py-4">
              <div className="rounded-md bg-muted p-3">
                <p className="font-medium">{deletingTodo.title}</p>
                {deletingTodo.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {deletingTodo.description}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeletingTodo(null);
              }}
              disabled={deleteMutation.isPending}
              className="bg-blue-100/90 hover:bg-blue-200"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTodo}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
