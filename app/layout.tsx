import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SessionProvider } from "next-auth/react";
import { RootProviders } from "@/contexts/rootproviders";
import { commonSettings } from "@/content/common";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: commonSettings.siteTitle,
  description: commonSettings.siteDescription,
  keywords: commonSettings.siteKeywords,
  metadataBase: new URL(commonSettings.siteUrl),
  openGraph: {
    title: commonSettings.siteTitle,
    description: commonSettings.siteDescription,
    images: [
      {
        url: commonSettings.siteImage,
        width: commonSettings.siteImageWidth,
        height: commonSettings.siteImageHeight,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: commonSettings.siteTitle,
    description: commonSettings.siteDescription,
    images: [
      {
        url: commonSettings.siteImage,
        width: commonSettings.siteImageWidth,
        height: commonSettings.siteImageHeight,
      },
    ],
  },
  alternates: {
    canonical: commonSettings.siteUrl,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      {
        url: "/favicon/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        url: "/favicon/favicon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/favicon/favicon.ico",
    apple: {
      url: "/favicon/apple-touch-icon.png",
      sizes: "180x180",
    },
  },
  appleWebApp: {
    title: commonSettings.siteTitle,
  },
  manifest: "/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <SessionProvider>
          <RootProviders>{children}</RootProviders>
        </SessionProvider>
      </body>
    </html>
  );
}
