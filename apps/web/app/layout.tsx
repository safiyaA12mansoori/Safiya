import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Milk EPR",
  description: "Core enterprise platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
