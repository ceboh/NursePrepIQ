import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NursePrepIQ | Nursing Licensure Prep Made Simple",
  description: "Learn nursing concepts, practice original exam-style questions, and build clinical judgment for RN and PN licensure preparation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
