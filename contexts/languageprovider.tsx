"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useSession } from "next-auth/react";
import enTranslations from "@/content/en/index";
import svTranslations from "@/content/sv/index";
import { UserLanguage } from "@/lib/db/tables/user";

import { LANGUAGES } from "@/content/common";

// Re-export for backward compatibility
export { LANGUAGES };

// Define language type
export type Language = UserLanguage;

// Define the shape of our translation objects
type TranslationDictionary = {
  [key: string]: string;
};

// Create translation dictionaries
export const translations: Record<Language, TranslationDictionary> = {
  en: enTranslations,
  sv: svTranslations,
};

// Create a type for all available translation keys
export type TranslationKey = keyof typeof enTranslations;

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  isLoaded: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

interface LanguageProviderProps {
  children: ReactNode;
  initialLanguage?: Language;
}

export function LanguageProvider({
  children,
  initialLanguage,
}: LanguageProviderProps) {
  const { data: session } = useSession();
  const [language, setLanguageState] = useState<Language>(
    initialLanguage || "en"
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved language preference from localStorage first, then database
  useEffect(() => {
    let isMounted = true;

    const loadLanguage = async () => {
      try {
        // First check localStorage for immediate loading (both logged-in and anonymous users)
        if (!initialLanguage) {
          const storedLanguage = localStorage.getItem("language");
          if (storedLanguage === "en" || storedLanguage === "sv") {
            if (isMounted) {
              setLanguageState(storedLanguage);
            }
          }
        }

        // Then fetch from database if user is logged in (will override localStorage if different)
        if (session?.user && !initialLanguage) {
          const response = await fetch("/api/user/preferences", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          if (response.ok) {
            const userData = await response.json();
            if (
              isMounted &&
              userData.language &&
              (userData.language === "en" || userData.language === "sv")
            ) {
              setLanguageState(userData.language);
              // Also update localStorage to match database
              localStorage.setItem("language", userData.language);
            }
          }
        }

        if (isMounted) {
          setIsLoaded(true);
        }
      } catch (error) {
        console.error("Failed to load language preference:", error);
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    if (session !== undefined) {
      // Wait for session to be determined
      loadLanguage();
    }

    return () => {
      isMounted = false;
    };
  }, [session, initialLanguage]);

  // Set language and save to database or localStorage
  const setLanguage = useCallback(
    async (lang: Language) => {
      try {
        // Update state immediately
        setLanguageState(lang);

        // Save to localStorage for all users (fallback for non-logged in)
        if (typeof window !== "undefined") {
          localStorage.setItem("language", lang);
        }

        // Save to database if user is logged in
        if (session?.user) {
          await fetch("/api/user/preferences", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language: lang }),
          });
        }
      } catch (error) {
        console.error("Failed to save language preference:", error);
      }
    },
    [session]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Internal hook for accessing the context
export function useLanguageContext() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error(
      "useLanguageContext must be used within a LanguageProvider"
    );
  }
  return context;
}
