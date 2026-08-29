import type { Metadata } from "next";
import { Toaster } from "sonner";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

// Plus Jakarta Sans (self-hosted via @fontsource, not next/font/google) is
// the display face for headings, nav, and numerals — see docs/DESIGN.md.
// Self-hosting via an npm package rather than next/font/google means no
// build-time dependency on fetching fonts.googleapis.com, which matters
// in network-restricted CI/sandbox environments.

export const metadata: Metadata = {
  title: "Fonsi POS — Business Operations Platform",
  description:
    "Modern multi-tenant Point of Sale and business operations platform for small and medium-sized businesses in Kenya and beyond.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
