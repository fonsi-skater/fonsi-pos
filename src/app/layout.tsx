import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

// Using the system font stack (declared in globals.css via --font-geist-sans
// fallback) instead of next/font/google, since it removes a build-time
// dependency on fetching fonts.googleapis.com — important for CI/sandboxed
// environments with restricted network egress. Swap back to next/font/google
// any time by restoring the Geist import here.

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
