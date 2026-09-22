import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gen-z AI | India-first Affordable AI Tutor",
  description: "Affordable multilingual AI tutor for Indian students with regional-language learning, Photo Solve, PDF study, notes, quizzes and exam prep.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
