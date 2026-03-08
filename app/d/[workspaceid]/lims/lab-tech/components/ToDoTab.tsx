/**
 * To Do Tab Component
 * - Task management and to-do list
 */
"use client";
import TodosList from "../../../ehr/doctor/todos/todos-list";

export default function ToDoTab({ workspaceid }: { workspaceid: string }) {
  return <TodosList workspaceid={workspaceid} showHomeButton={false} />;
}
