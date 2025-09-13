import { ThemeProvider } from "@/contexts/themeprovider";
import { LanguageProvider } from "@/contexts/languageprovider";
import { Language } from "@/contexts/languageprovider";
import { User } from "@/lib/db/tables/user";

interface DashboardProvidersProps {
  children: React.ReactNode;
  user: User | null;
}

export function DashboardProviders({
  children,
  user,
}: DashboardProvidersProps) {
  // Extract user preferences or use defaults
  const initialTheme = user?.theme || "system";
  // Only pass initialLanguage if user is logged in, otherwise let localStorage take precedence
  const initialLanguage = user?.language as Language;

  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      <ThemeProvider initialTheme={initialTheme}>
        {children}
      </ThemeProvider>
    </LanguageProvider>
  );
}
