import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { invitation } from "@/content/invitation";
import { PaperGrain } from "@/components/PaperGrain";
import "./globals.css";

/**
 * Display face — docs/design-plan.md § Type. Flared stems and fine incised,
 * tapering serifs: the same formal logic as the burin stroke in the botanical
 * plates. One weight, by design.
 */
const gilda = localFont({
  src: "../public/fonts/gilda-display-400.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-gilda",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: false,
});

/** Body face. Variable, wght restricted to the 400–500 we actually ship. */
const garamond = localFont({
  src: "../public/fonts/eb-garamond-var.woff2",
  weight: "400 500",
  style: "normal",
  display: "swap",
  variable: "--font-garamond",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: invitation.share.title,
  description: invitation.share.description,
  // A family invitation should not be in a search index.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: invitation.share.themeColor,
  width: "device-width",
  initialScale: 1,
  // Never cap zoom: the quality floor requires 200% to work.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${gilda.variable} ${garamond.variable}`}>
      <body>
        {children}
        <PaperGrain />
      </body>
    </html>
  );
}
