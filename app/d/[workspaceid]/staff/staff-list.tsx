"use client";
import { useEffect, useState } from "react";

type Staff = {
  staffid: string;
  role: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  unit?: string | null;
  specialty?: string | null;
  phone?: string | null;
  email?: string | null;
};

export default function StaffList({ workspaceid }: { workspaceid: string }) {
  const [rows, setRows] = useState<Staff[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/d/${workspaceid}/staff`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load staff");
        const data = await res.json();
        if (!active) return;
        setRows((data.staff as Staff[]) ?? []);
      } catch (e: unknown) {
        if (!active) return;
        const msg = e instanceof Error ? e.message : "Failed to load staff";
        setError(msg);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [workspaceid]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (rows === null) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No staff found.</p>;

  return (
    <ul className="space-y-2">
      {rows.map((s: Staff) => (
        <li key={s.staffid} className="border rounded-md p-3">
          <div className="font-medium">
            {s.firstname} {s.middlename ? `${s.middlename} ` : ""}
            {s.lastname} — <span className="uppercase text-xs">{s.role}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {s.unit ? `Unit: ${s.unit} • ` : ""}
            {s.specialty ? `Specialty: ${s.specialty} • ` : ""}
            {s.phone ? `Phone: ${s.phone} • ` : ""}
            {s.email ? `Email: ${s.email}` : ""}
          </div>
        </li>
      ))}
    </ul>
  );
}
