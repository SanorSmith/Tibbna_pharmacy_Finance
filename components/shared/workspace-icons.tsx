import { Building2, TestTube, Pill, LucideIcon } from "lucide-react";
import { TranslationKey } from "@/contexts/languageprovider";

export type WorkspaceType = "hospital" | "laboratory" | "pharmacy";

// Workspace type label mapping for translations
export const workspaceTypeLabels: Record<WorkspaceType, string> = {
  hospital: "Hospital",
  laboratory: "Laboratory",
  pharmacy: "Pharmacy",
};

// Map workspace types to their corresponding icons
export const workspaceIcons: Record<WorkspaceType, LucideIcon> = {
  hospital: Building2,
  laboratory: TestTube,
  pharmacy: Pill,
};

// Get icon component for a workspace type
export function getWorkspaceIcon(type: WorkspaceType): LucideIcon {
  return workspaceIcons[type] || Building2; // Default to Building2 if type not found
}

// Get translated label for workspace type
export function getWorkspaceLabel(
  type: WorkspaceType,
  ttt: (key: TranslationKey, params?: Record<string, string>) => string,
): string {
  const label = workspaceTypeLabels[type] || "Hospital";
  return ttt(label as TranslationKey);
}

// Get workspace type display name (capitalized)
export function getWorkspaceDisplayName(type: WorkspaceType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// Workspace icon component with consistent styling
interface WorkspaceIconProps {
  type: WorkspaceType;
  className?: string;
  size?: number;
}

export function WorkspaceIcon({
  type,
  className = "size-4",
  size,
}: WorkspaceIconProps) {
  const IconComponent = getWorkspaceIcon(type);

  return <IconComponent className={className} size={size} />;
}

// Get workspace type display colors for consistent theming
export const workspaceColors: Record<WorkspaceType, string> = {
  hospital: "bg-red-500 text-white",
  laboratory: "bg-blue-500 text-white",
  pharmacy: "bg-green-500 text-white",
};

// Get workspace type background color
export function getWorkspaceColor(type: WorkspaceType): string {
  return workspaceColors[type] || "bg-gray-500 text-white";
}

// Workspace icon with colored background
interface WorkspaceIconWithBgProps {
  type: WorkspaceType;
  className?: string;
  iconClassName?: string;
}

export function WorkspaceIconWithBg({
  type,
  className = "flex aspect-square size-8 items-center justify-center rounded-lg",
  iconClassName = "size-4",
}: WorkspaceIconWithBgProps) {
  const IconComponent = getWorkspaceIcon(type);
  const colorClass = getWorkspaceColor(type);

  return (
    <div className={`${className} ${colorClass}`}>
      <IconComponent className={iconClassName} />
    </div>
  );
}
