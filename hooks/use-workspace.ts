"use client";

import { useWorkspaceContext } from "@/contexts/workspaceprovider";

export function useWorkspace() {
  return useWorkspaceContext();
}
