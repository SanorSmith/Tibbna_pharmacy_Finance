/**
 * UI Constants for consistent design across the application
 */

export const DIALOG_SIZES = {
  // Standard dialog size - matches OrderDetails dialog
  STANDARD: `
    w-[95vw]
    sm:w-[90vw]
    lg:w-[90vw]
    max-w-[90vw]
    max-h-[90vh]
    overflow-y-auto
  `,
  
  // Small dialog for simple forms/confirmations
  SMALL: "sm:max-w-[500px]",
  
  // Medium dialog for detailed forms
  MEDIUM: "sm:max-w-[800px] max-h-[90vh] overflow-y-auto",
  
  // Large dialog for complex content
  LARGE: "max-w-4xl max-h-[90vh] overflow-y-auto",
  
  // Extra large for full-screen content
  EXTRA_LARGE: "max-w-6xl max-h-[90vh] overflow-y-auto",
} as const;

export const DIALOG_TYPES = {
  STANDARD: "STANDARD",
  SMALL: "SMALL", 
  MEDIUM: "MEDIUM",
  LARGE: "LARGE",
  EXTRA_LARGE: "EXTRA_LARGE",
} as const;

export type DialogType = keyof typeof DIALOG_TYPES;

/**
 * Get dialog CSS classes based on type
 */
export function getDialogClasses(type: DialogType = "STANDARD"): string {
  return DIALOG_SIZES[type];
}
