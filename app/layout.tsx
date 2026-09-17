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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
