import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { invitation } from "@/content/invitation";
import { PaperGrain } from "@/components/PaperGrain";
import { SEEN_KEY } from "@/components/Envelope";
import "./globals.css";

/**
 * The two faces the client's reference uses, and now the only two here —
 * docs/reference/maison-doree/README.md. Revisions 1-4 set Gilda Display,
 * EB Garamond and Pinyon Script, which is what made the page read as a
 * different class of object next to the reference: the type was the gap as
 * much as the material was.
 *
 * Display: names, the line that does the inviting, section titles. Parfumerie
 * is a connecting copperplate, so the subset keeps init/fina/fin2/fin3 — the
 * entry and exit strokes. Without them it sets as detached letters.
 */
const parfumerie = localFont({
  src: "../public/fonts/parfumerie-script-400.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-parfumerie",
  fallback: ["Snell Roundhand", "Apple Chancery", "cursive"],
  adjustFontFallback: "Times New Roman",
});

/**
 * Everything else: body copy, dates, times, figures, labels.
 *
 * Roman only. The italic and the bold were cut here too and shipped, and both
 * came back `unloaded` from every probe — nothing on the page sets either — but
 * next/font preloads every face in a family, so they were taking ~17 KB of the
 * critical path ahead of the faces that are actually drawn. On Slow 4G that
 * pushed the swap out to 3.8 s and the reflow cost 0.076 of the CLS budget.
 * Add a face back here when something needs it, not before.
 */
const eaves = localFont({
  src: "../public/fonts/mrs-eaves-roman.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-eaves",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

/**
 * Mrs Eaves' own small caps, as a separate family rather than
 * `font-variant: small-caps`, which synthesises them by scaling the capitals
 * and thins every stroke doing it. Used for the date and the venue, never as
 * a tracked-out eyebrow label — CLAUDE.md bans those and the reference's use
 * of them is one of the four things not to copy.
 */
const eavesSmallCaps = localFont({
  src: "../public/fonts/mrs-eaves-smallcaps.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-eaves-sc",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  // 17 characters: truncates cleanly in a WhatsApp preview, which is where most
  // of this audience will meet it first.
  title: invitation.share.title,
  description: invitation.share.description,
  // A family invitation should not be in a search index.
  robots: { index: false, follow: false },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://advikaandsooraj.vercel.app",
  ),
  openGraph: {
    type: "website",
    title: invitation.share.title,
    description: invitation.share.description,
  },
  twitter: {
    card: "summary_large_image",
    title: invitation.share.title,
    description: invitation.share.description,
  },
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
    <html
      lang="en"
      className={`${parfumerie.variable} ${eaves.variable} ${eavesSmallCaps.variable}`}
      // The script below deliberately adds `envelope-armed` to this element
      // before React hydrates, so the DOM carries a class the client render
      // does not produce. That is the whole point of a pre-paint script, and
      // it is the one place on this page where the server and client markup
      // are expected to differ. Suppression applies to this element's own
      // attributes only — it hides nothing about the tree beneath it.
      suppressHydrationWarning
    >
      <head>
        {/*
         * The cover photograph, preloaded at high priority: it is the first
         * thing a guest sees and it must not arrive after the wax.
         *
         * This preloaded `/cover/envelope.webp` until revision 6 and had done
         * since revision 4 renamed the file. The URL 404'd on every load —
         * a wasted round trip on the critical path, and it hid nothing because
         * the overlay fetches its own image anyway. `media` picks the same crop
         * the stylesheet does at the same breakpoint, so exactly one is
         * fetched, and if the two ever disagree the preload is merely unused
         * rather than wrong.
         */}
        <link
          rel="preload"
          as="image"
          href="/cover/envelope-portrait.webp"
          media="(max-aspect-ratio: 1/1)"
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="image"
          href="/cover/envelope-landscape.webp"
          media="(min-aspect-ratio: 1/1)"
          fetchPriority="high"
        />
        {/*
         * Arms the envelope before first paint, so a returning guest never sees
         * it flash and a first-time guest never sees the invitation flash
         * behind it. Deliberately blocking and deliberately tiny.
         *
         * If this script does not run — JavaScript off, a parse error, a
         * blocked inline script — the class is never set, the overlay stays
         * hidden by CSS, and the guest simply lands on the invitation. That is
         * the right direction to fail in.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add("js");try{if(localStorage.getItem(${JSON.stringify(SEEN_KEY)})!=="1"&&location.hash!=="#invitation")document.documentElement.classList.add("envelope-armed")}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <PaperGrain />
      </body>
    </html>
  );
}
