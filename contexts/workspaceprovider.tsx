"use client";
import React, { createContext, useContext } from "react";
import { UserWorkspace } from "@/lib/db/tables/workspace";

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

interface WorkspaceContextType {
  workspaces: UserWorkspace[];
  workspaceid: string;
  workspace: UserWorkspace;
}

interface WorkspaceProviderProps {
  children: React.ReactNode;
  workspaces: UserWorkspace[];
  workspaceid: string;
}

export function WorkspaceProvider({
  children,
  workspaces,
  workspaceid,
}: WorkspaceProviderProps) {
  const workspace = workspaces.find(
    (w) => w.workspace.workspaceid === workspaceid,
  );

  if (!workspace) {
    window.location.href = "/d/empty";
    return;
  }
  const contextValue: WorkspaceContextType = {
    workspaces,
    workspaceid,
    workspace,
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error(
      "useWorkspaceContext must be used within a WorkspaceProvider",
    );
  }
  return context;
}
