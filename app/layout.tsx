import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";
import Script from "next/script";

export const metadata: Metadata = {
  metadataBase: new URL("https://genzstudy.in"),
  title: "Gen-z AI | India-first Affordable AI Tutor",
  description: "Affordable multilingual AI tutor for Indian students with regional-language learning, Photo Solve, PDF study, notes, quizzes and exam prep.",
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
