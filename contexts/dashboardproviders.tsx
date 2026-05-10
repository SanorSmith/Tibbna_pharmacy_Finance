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
  // Only pass initialLanguage if user is logged in, otherwise let localStorage take precedence
  const initialLanguage = user?.language as Language;

  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      <ThemeProvider>{children}</ThemeProvider>
    </LanguageProvider>
  );
}
