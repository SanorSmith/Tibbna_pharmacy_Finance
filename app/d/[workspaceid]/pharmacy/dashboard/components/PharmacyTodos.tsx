/**
 * Pharmacy Todos Component
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
import { Pencil, Trash2, Plus, CheckCircle2, Circle } from "lucide-react";

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
};

export default function PharmacyTodos({ workspaceid }: Props) {
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
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
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
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Pharmacy Tasks</h2>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-[#618FF5] hover:bg-[#4a6fd4] text-white flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Todos List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>My Tasks ({incompleteTodos.length} active)</span>
            {completedTodos.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {completedTodos.length} completed
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          ) : todos.length === 0 ? (
            <div className="text-center py-8">
              <Circle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No tasks yet. Click "Add Task" to create your first pharmacy task.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Incomplete Todos */}
              {incompleteTodos.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Active Tasks
                  </h3>
                  <ul className="space-y-2">
                    {incompleteTodos.map((todo) => (
                      <li
                        key={todo.todoid}
                        className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <button
                            onClick={() => handleToggleComplete(todo)}
                            className="mt-0.5 text-gray-400 hover:text-[#618FF5] transition-colors"
                            aria-label="Mark task as done"
                          >
                            <Circle className="h-5 w-5" />
                          </button>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                              {todo.title}
                              <span
                                className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(
                                  todo.priority
                                )}`}
                              >
                                {todo.priority}
                              </span>
                            </div>
                            {todo.description && (
                              <p className="mt-1 text-sm text-gray-600">
                                {todo.description}
                              </p>
                            )}
                            {todo.duedate && (
                              <p className="mt-1 text-xs text-gray-500">
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
                            className="text-[#618FF5] hover:text-[#4a6fd4] hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteDialog(todo)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
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
                  <h3 className="text-sm font-semibold text-gray-700">
                    Completed ({completedTodos.length})
                  </h3>
                  <ul className="space-y-2">
                    {completedTodos.map((todo) => (
                      <li
                        key={todo.todoid}
                        className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 bg-gray-50"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <button
                            onClick={() => handleToggleComplete(todo)}
                            className="mt-0.5 text-green-500 hover:text-green-600 transition-colors"
                            aria-label="Mark task as not done"
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </button>
                          <div className="flex-1">
                            <div className="line-through text-gray-500">
                              {todo.title}
                            </div>
                            {todo.description && (
                              <p className="mt-1 text-sm text-gray-400 line-through">
                                {todo.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteDialog(todo)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
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
              Add New Task
            </DialogTitle>
            <DialogDescription>
              Create a new task for your pharmacy workflow
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
                placeholder="e.g. Restock Paracetamol, Check expiry dates"
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
                placeholder="Add notes, batch numbers, or other details"
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
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTodo}
              disabled={!formData.title.trim() || createMutation.isPending}
              className="bg-[#618FF5] hover:bg-[#4a6fd4]"
            >
              {createMutation.isPending ? "Adding..." : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Todo Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update your task details</DialogDescription>
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
                placeholder="Task title"
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
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditTodo}
              disabled={!formData.title.trim() || updateMutation.isPending}
              className="bg-[#618FF5] hover:bg-[#4a6fd4]"
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
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be
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
