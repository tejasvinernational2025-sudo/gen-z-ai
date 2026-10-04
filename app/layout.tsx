import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";
import Script from "next/script";

export const metadata: Metadata = {
  metadataBase: new URL("https://genzstudy.in"),
  title: "Gen-z AI | India-first Affordable AI Tutor",
  description: "Affordable multilingual AI tutor for Indian students with regional-language learning, Photo Solve, PDF study, notes, quizzes and exam prep.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://genzstudy.in",
    siteName: "Gen-z AI",
    title: "Gen-z AI | Affordable Personal AI Tutor for Indian Students",
    description: "Learn, practise and revise with Guided Tuition, Photo Solve, PDF Study and multilingual AI support.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Gen-z AI affordable personal AI tutor" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gen-z AI | Affordable Personal AI Tutor",
    description: "Guided Tuition, Photo Solve, PDF Study and multilingual learning support for Indian students.",
    images: ["/opengraph-image"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#6c4cff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        {children}
        <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
        <Script src="/_vercel/speed-insights/script.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
