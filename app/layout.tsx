import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const ADSENSE_PUBLISHER_ID = "ca-pub-2402279863800005";

export const metadata: Metadata = {
  title: "NursePrepIQ | Nursing Licensure Prep Made Simple",
  description: "Learn nursing concepts, practice original exam-style questions, and build clinical judgment for RN and PN licensure preparation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
      <Script
        id="google-adsense"
        async
        strategy="afterInteractive"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
        crossOrigin="anonymous"
      />
    </html>
  );
}
