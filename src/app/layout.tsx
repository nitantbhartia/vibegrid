import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeGrid — The Million Dollar Homepage for Vibe Coders",
  description:
    "A permanent visual grid where indie builders claim space to showcase their apps. Dynamic pricing rewards early adopters. Claim your spot today.",
  openGraph: {
    title: "VibeGrid — Claim Your Spot",
    description:
      "The Million Dollar Homepage for the vibe coding era. A permanent wall of fame for indie builders.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeGrid — Claim Your Spot",
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
    <html lang="en" className="dark">
      <body className="antialiased bg-[#030712] text-gray-50">
        {children}
      </body>
    </html>
  );
}
