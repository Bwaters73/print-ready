import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Print Ready — Concept to Print-Ready Listing",
  description:
    "Draft rendering directions, generate artwork locally, review candidates, then upscale, crop to print sizes, and write listing SEO in one pass.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="grain">{children}</body>
    </html>
  );
}
