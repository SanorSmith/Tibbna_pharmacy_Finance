"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";

type TodoItem = {
  id: number;
  title: string;
  description?: string;
  done: boolean;
};

export default function DoctorTodosPage() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function addTodo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;

    const newTodo: TodoItem = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim() || undefined,
      done: false,
    };

    setTodos((prev) => [newTodo, ...prev]);
    setTitle("");
    setDescription("");
  }

  function toggleTodo(id: number) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  }

  // NOTE: We don't know workspaceid here on the client, so this back button
  // just uses history. If you prefer an explicit URL, we can switch to a
  // server component that receives workspaceid.
  function goBackToDashboard() {
    window.history.back();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Doctor Todos</h1>
        <Button variant="outline" size="sm" onClick={goBackToDashboard}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Add new todo</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={addTodo}>
              <div className="space-y-1">
                <label className="text-xs font-medium" htmlFor="todo-title">
                  Title
                </label>
                <Input
                  id="todo-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Call patient about lab results"
                />
              </div>
              <div className="space-y-1">
                <label
                  className="text-xs font-medium"
                  htmlFor="todo-description"
                >
                  Details (optional)
                </label>
                <Textarea
                  id="todo-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Add clinical context, patient ID, or priority notes"
                />
              </div>
              <Button type="submit" className="w-full" disabled={!title.trim()}>
                Add todo
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">My todo list</CardTitle>
          </CardHeader>
          <CardContent>
            {todos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No todos yet. Use the form to add tasks for today.
              </p>
            ) : (
              <ul className="space-y-2">
                {todos.map((todo) => (
                  <li
                    key={todo.id}
                    className="flex items-start justify-between gap-3 rounded border px-3 py-2 text-sm"
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={todo.done}
                        onChange={() => toggleTodo(todo.id)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300"
                        aria-label="Mark todo as done"
                      />
                      <div>
                        <div
                          className={
                            todo.done
                              ? "line-through text-muted-foreground"
                              : "font-medium"
                          }
                        >
                          {todo.title}
                        </div>
                        {todo.description && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {todo.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}