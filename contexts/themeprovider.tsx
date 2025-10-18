"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Theme } from "@radix-ui/themes";
import { useSession } from "next-auth/react";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={"light"}
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <RadixThemeWrapper>{children}</RadixThemeWrapper>
    </NextThemesProvider>
  );
}

function RadixThemeWrapper({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [mounted, setMounted] = React.useState(false);
  const [, setCurrentTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    setMounted(true);

    // Get the actual computed theme
    const theme = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    setCurrentTheme(theme);

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
      setCurrentTheme(newTheme);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Load user's saved theme on mount
  React.useEffect(() => {
    if (session?.user && mounted) {
      // You can implement loading user's saved theme here if needed
      // For now, we'll let next-themes handle the initial theme
    }
  }, [session, mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <Theme accentColor="gray" radius="large" appearance="light">
      {children}
    </Theme>
  );
}
