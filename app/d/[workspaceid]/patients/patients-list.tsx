/**
 * Client Component: PatientsList
 * - Fetches patients via GET /api/d/[workspaceid]/patients and renders a simple list.
 * - Shows loading and basic error states; relies on same-origin cookies for auth.
 * - Used by the server page at /d/[workspaceid]/patients.
 */
"use client";
import { useEffect, useState } from "react";

type Patient = {
  patientid: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  nationalid?: string | null;
  phone?: string | null;
  email?: string | null;
  ehrid?: string | null;
};

export default function PatientsList({ workspaceid }: { workspaceid: string }) {
  const [rows, setRows] = useState<Patient[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        // Query the workspace-scoped patients endpoint; cookies carry auth
        const res = await fetch(`/api/d/${workspaceid}/patients`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load patients");
        const data = await res.json();
        if (!active) return;
        setRows((data.patients as Patient[]) ?? []);
      } catch (e: unknown) {
        if (!active) return;
        const msg = e instanceof Error ? e.message : "Failed to load patients";
        setError(msg);
      }
    }
    // Kick off initial load
    load();
    return () => {
      // Guard against setState after unmount
      active = false;
    };
  }, [workspaceid]);

  // Error boundary fallback
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  // Loading placeholder while fetching
  if (rows === null) return <p className="text-sm text-muted-foreground">Loading...</p>;

  // Empty state
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No patients found.</p>;
  }

  return (
    <ul className="space-y-2">
      {rows.map((p: Patient) => (
        <li key={p.patientid} className="border rounded-md p-3">
          <div className="font-medium">
            {p.firstname} {p.middlename ? `${p.middlename} ` : ""}
            {p.lastname}
          </div>
          <div className="text-xs text-muted-foreground">
            {p.nationalid ? `ID: ${p.nationalid} • ` : ""}
            {p.phone ? `Phone: ${p.phone} • ` : ""}
            {p.email ? `Email: ${p.email}` : ""}
            {p.ehrid ? ` • EHR: ${p.ehrid}` : ""}
          </div>
        </li>
      ))}
    </ul>
  );
}
