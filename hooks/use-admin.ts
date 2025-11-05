/**
 * Hook: useIsGlobalAdmin
 * - Client hook that checks if the current user has global "admin" permission.
 * - Hits /api/d/[workspaceid]/admin-check and returns a boolean.
 * - Used to conditionally render admin-only navigation and actions.
 */
"use client";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/hooks/use-workspace";

export function useIsGlobalAdmin() {
  const { workspaceid } = useWorkspace();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    async function check() {
      if (!workspaceid) return;
      try {
        const res = await fetch(`/api/d/${workspaceid}/admin-check`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setIsAdmin(!!data?.isGlobalAdmin);
      } catch {
        // ignore
      }
    }
    check();
    return () => {
      active = false;
    };
  }, [workspaceid]);

  return isAdmin;
}
