import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VIBE GRID // The Million Dollar Homepage for Vibe Coders",
  description:
    "A permanent visual grid where indie builders claim space to showcase their apps. Dynamic pricing rewards early adopters. Claim your spot today.",
  openGraph: {
    title: "VIBE GRID — Claim Your Spot",
    description:
      "The Million Dollar Homepage for the vibe coding era. A permanent wall of fame for indie builders.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VIBE GRID — Claim Your Spot",
    description:
      "The Million Dollar Homepage for the vibe coding era. Claim your spot on the grid.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
