import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShotBrief",
  description:
    "Local-first AI brief builder and renderer for App Store and Google Play screenshots."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
