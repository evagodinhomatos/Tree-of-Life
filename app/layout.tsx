import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tree of Life Explorer",
  description: "An interactive phylogenetic tree for exploring evolutionary relationships.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
