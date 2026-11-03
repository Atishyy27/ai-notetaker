import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Serif display for large editorial headings only (hero + session title); the
// serif-display / mono-chrome contrast is the signature of the design.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

// metadataBase resolves relative OG/Twitter image URLs against the live origin.
// Set NEXT_PUBLIC_SITE_URL to the deployed URL in the hosting env; falls back to
// localhost for dev.
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "baithak",
    template: "%s · baithak",
  },
  description:
    "Record or upload a meeting and get a clean transcript, a topic-wise summary, and tracked action items. Recordings and transcripts are saved so your sessions persist and the product improves.",
  keywords: [
    "meeting notes",
    "transcription",
    "action items",
    "voice AI",
    "speech to text",
    "Hindi",
    "Indic languages",
  ],
  openGraph: {
    title: "baithak",
    description:
      "Turn any meeting into a transcript, summary, and tracked action items.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "baithak",
    description:
      "Turn any meeting into a transcript, summary, and tracked action items.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Cache components are enabled, so ClerkProvider goes inside <body>. */}
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
