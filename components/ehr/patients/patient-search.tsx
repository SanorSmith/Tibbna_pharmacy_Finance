"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";

interface Patient {
  patientid: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  nationalid?: string | null;
}

interface PatientSearchProps {
  workspaceid: string;
}

export function PatientSearch({ workspaceid }: PatientSearchProps) {
  const [query, setQuery] = useState("");
  const [allPatients, setAllPatients] = useState<Patient[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!query || allPatients) return;

    let cancelled = false;

    const loadPatients = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/d/${workspaceid}/patients`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load patients");
        const data = await res.json();
        if (!cancelled) {
          setAllPatients((data.patients as Patient[]) ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          const msg =
            e instanceof Error ? e.message : "Failed to load patients";
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadPatients();

    return () => {
      cancelled = true;
    };
  }, [allPatients, query, workspaceid]);

  const results = useMemo(() => {
    if (!query.trim() || !allPatients) return [];
    const q = query.toLowerCase();
    return allPatients
      .filter((p) => {
        const fullName = `${p.firstname} ${p.middlename || ""} ${
          p.lastname
        }`.toLowerCase();
        const nationalId = (p.nationalid || "").toLowerCase();
        return fullName.includes(q) || nationalId.includes(q);
      })
      .slice(0, 8);
  }, [allPatients, query]);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-current" />
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!touched) setTouched(true);
          }}
          placeholder="Search patients by name or ID..."
          className="
    pl-9 pr-3 h-9 text-current text-sm placeholder:text-current/70
    focus-visible:ring-0 focus-visible:ring-offset-0
    focus:ring-[1px] focus:ring-orange-400 focus:border-orange-400
  "
        />
      </div>

      {touched && query && (
        <Card className="absolute z-20 mt-1 w-72 max-h-44 overflow-y-auto shadow-sm">
          {loading && !allPatients && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Loading patients...
            </div>
          )}

          {error && (
            <div className="px-3 py-2 text-xs text-red-600">{error}</div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No patients found matching &quot;{query}&quot;.
            </div>
          )}

          {!loading &&
            !error &&
            results.map((p) => {
              const fullName = `${p.firstname} ${
                p.middlename ? `${p.middlename} ` : ""
              }${p.lastname}`;

              return (
                <button
                  key={p.patientid}
                  type="button"
                  className="w-full text-left flex flex-col items-start px-3 py-2 
                     text-black text-sm hover:bg-gray-100"
                  onClick={() => {
                    window.location.href = `/d/${workspaceid}/patients/${p.patientid}`;
                  }}
                >
                  <span className="font-medium">{fullName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {p.nationalid || "No ID"}
                  </span>
                </button>
              );
            })}
        </Card>
      )}
    </div>
  );
}
