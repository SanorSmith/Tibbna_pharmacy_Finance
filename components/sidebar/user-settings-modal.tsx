"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Palette, Globe, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/hooks/use-language";
import { Language, TranslationKey } from "@/contexts/languageprovider";

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const themes = [
  { value: "light", label: "Light", preview: "bg-white border-gray-200" },
  { value: "dark", label: "Dark", preview: "bg-gray-900 border-gray-700" },
];

const languages = [
  { value: "en" as Language, label: "English", flag: "🇺🇸" },
  { value: "sv" as Language, label: "Svenska", flag: "🇸🇪" },
];

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, ttt } = useLanguage();

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-blue-100/80">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {ttt("Account Settings")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 ">
          {/* Theme Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-4 w-4" />
                {ttt("Theme")}
              </CardTitle>
              <CardDescription>
                {ttt("Choose your preferred theme appearance")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {themes.map((themeOption) => (
                  <button
                    key={themeOption.value}
                    onClick={() => handleThemeChange(themeOption.value)}
                    className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:bg-muted/50 ${
                      theme === themeOption.value
                        ? "border-primary bg-primary/5"
                        : "border-muted"
                    }`}
                  >
                    <div
                      className={`h-8 w-12 rounded border-2 ${themeOption.preview}`}
                    />
                    <span className="text-sm font-medium">
                      {ttt(themeOption.label as TranslationKey)}
                    </span>
                    {theme === themeOption.value && (
                      <Check className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground p-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Language Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-4 w-4" />
                {ttt("Language")}
              </CardTitle>
              <CardDescription>
                {ttt("Select your preferred language")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="language-select">{ttt("Language")}</Label>
                <Select
                  value={language}
                  onValueChange={(value) =>
                    handleLanguageChange(value as Language)
                  }
                >
                  <SelectTrigger id="language-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        <div className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
