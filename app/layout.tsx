import type { Metadata } from "next";
import "./globals.css";

const ADSENSE_PUBLISHER_ID = "ca-pub-2402279863800005";

export const metadata: Metadata = {
  title: "NursePrepIQ | Nursing Licensure Prep Made Simple",
  description: "Learn nursing concepts, practice original exam-style questions, and build clinical judgment for RN and PN licensure preparation.",
  other: {
    "google-adsense-account": ADSENSE_PUBLISHER_ID,
  },
};

// Do not load the AdSense runtime globally. Global loading lets Auto ads appear
// on auth, onboarding, dashboard, exam, loading/error, and other low-content
// interaction screens. AdSense belongs only in explicitly approved,
// content-rich route layouts/components.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
