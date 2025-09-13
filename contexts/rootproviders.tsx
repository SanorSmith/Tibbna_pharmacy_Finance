"use client";

import { ThemeProvider } from "@/contexts/themeprovider";
import { LanguageProvider } from "@/contexts/languageprovider";

interface RootProvidersProps {
  children: React.ReactNode;
}

export function RootProviders({ children }: RootProvidersProps) {
  return (
    <LanguageProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </LanguageProvider>
  );
}
