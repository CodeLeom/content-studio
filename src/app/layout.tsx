import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notion AI Content Studio",
  description: "1-week content calendar + scripts in your Notion workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
