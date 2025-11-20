"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { CompositionListClient } from "./composition-list-client";
import { AddEncounterDialog } from "./add-encounter-dialog";

interface EhrCompositionsClientPageProps {
  ehrId: string;
}

export function EhrCompositionsClientPage({
  ehrId,
}: EhrCompositionsClientPageProps) {
  const { ttt } = useLanguage();
  const [isAddEncounterOpen, setIsAddEncounterOpen] = useState(false);
  const refreshCompositionsRef = useRef<(() => void) | null>(null);

  const handleEncounterSuccess = () => {
    // Trigger refresh of compositions list
    if (refreshCompositionsRef.current) {
      refreshCompositionsRef.current();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{ttt("Compositions")}</h2>
          <p className="text-sm text-muted-foreground">
            {ttt("EHR ID")}: {ehrId}
          </p>
        </div>
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
        onSuccess={handleEncounterSuccess}
      />
    </div>
  );
}
