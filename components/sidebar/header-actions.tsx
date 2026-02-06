"use client";

import { useState } from "react";
import { Settings, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserSettingsModal } from "./user-settings-modal";
import { useLanguage } from "@/hooks/use-language";

export function HeaderActions() {
  const { ttt } = useLanguage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSettingsOpen(true)}
          className="text-current hover:bg-white/20"
        >
          <Settings className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">{ttt("Settings")}</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-current hover:bg-white/20"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">{ttt("Help")}</span>
        </Button>
      </div>

      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
