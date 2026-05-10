"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FlaskConical } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { CompositionListClient } from "./composition-list-client";
import { AddEncounterDialog } from "./add-encounter-dialog";
import { AddLabReportDialog } from "./add-lab-report-dialog";

interface EhrCompositionsClientPageProps {
  ehrId: string;
}

export function EhrCompositionsClientPage({
  ehrId,
}: EhrCompositionsClientPageProps) {
  const { ttt } = useLanguage();
  const [isAddEncounterOpen, setIsAddEncounterOpen] = useState(false);
  const [isAddLabReportOpen, setIsAddLabReportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const refreshCompositionsRef = useRef<(() => void) | null>(null);

  const handleSuccess = () => {
    // Trigger refresh of compositions list
    if (refreshCompositionsRef.current) {
      refreshCompositionsRef.current();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{ttt("Compositions")}</h2>
          <p className="text-sm text-muted-foreground">
            {ttt("EHR ID")}: {ehrId}
          </p>
        </div>
        
        {/* Search Field */}
        <div className="relative w-80">
          <Input
            type="text"
            placeholder="Search compositions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        
        <Button onClick={() => setIsAddLabReportOpen(true)} variant="outline">
          <FlaskConical className="h-4 w-4 mr-2" />
          {ttt("Add Lab Report")}
        </Button>
        <Button onClick={() => setIsAddEncounterOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {ttt("Add Encounter")}
        </Button>
      </div>

      <CompositionListClient
        ehrId={ehrId}
        onRefreshReady={(refreshFn) => {
          refreshCompositionsRef.current = refreshFn;
        }}
      />

      <AddEncounterDialog
        ehrId={ehrId}
        isOpen={isAddEncounterOpen}
        onClose={() => setIsAddEncounterOpen(false)}
        onSuccess={handleSuccess}
      />

      <AddLabReportDialog
        ehrId={ehrId}
        isOpen={isAddLabReportOpen}
        onClose={() => setIsAddLabReportOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
