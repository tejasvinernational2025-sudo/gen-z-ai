import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gen-z AI | India’s Affordable AI Study Assistant",
  description: "Learn in your language with an affordable multilingual AI tutor built for Indian students.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
