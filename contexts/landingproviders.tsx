import * as React from "react";
import { Theme } from "@radix-ui/themes";
import { SharedProviders } from "@/contexts/sharedproviders";

interface LandingProvidersProps {
  children: React.ReactNode;
}
export async function LandingProviders({ children }: LandingProvidersProps) {
  return (
    <SharedProviders>
      <Theme accentColor="gray" radius="large" appearance="dark">
        {children}
      </Theme>
    </SharedProviders>
  );
}
