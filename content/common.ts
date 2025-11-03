export const commonSettings = {
  Logo: "/logo.svg",
  LogoDark: "/logo-dark.svg",
  siteTitle: "Tibbna - For the people",
  siteDescription: "Tibbna - For the people",
  siteKeywords: "Tibbna, For the people",
  siteUrl: "https://app.tibbna.com",
  siteImage: "/logo.svg",
  siteImageDark: "/logo-dark.svg",
  siteImageWidth: 1200,
  siteImageHeight: 630,
};

// Define available languages
export const LANGUAGES = [
  { id: "en", title: "English" },
  { id: "sv", title: "Svenska" },
] as const;

// Extract language IDs for validation
export const LANGUAGE_IDS = LANGUAGES.map((l) => l.id);

// Type for language ID
export type LanguageId = (typeof LANGUAGES)[number]["id"];
