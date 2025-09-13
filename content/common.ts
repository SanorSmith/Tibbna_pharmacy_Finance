export const commonSettings = {
  Logo: "/logo.svg",
  LogoDark: "/logo-dark.svg",
  siteTitle: "IQMED - For the people",
  siteDescription: "IQMED - For the people",
  siteKeywords: "IQMED, For the people",
  siteUrl: "https://iqmed.iq",
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
