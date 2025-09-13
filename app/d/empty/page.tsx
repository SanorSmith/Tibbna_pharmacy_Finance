"use client";
import { useLanguage } from "@/hooks/use-language";

export default function Empty() {
  const { ttt } = useLanguage();
  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="space-y-6">
        <div className="text-center text-2xl font-bold">
          {ttt("Your account is not connected to any workspaces")}
        </div>
        <div className="text-center text-sm">
          {ttt("Please contact your administrator or support team")}
        </div>
      </div>
    </div>
  );
}
