import type { Metadata } from "next";
import "./globals.css";
import "./minimal.css";
import "./appearance.css";
import { AppTheme } from "@/components/app/theme-provider";

export const metadata: Metadata = {
  title: "Campus Loop — Mercado académico ITESA",
  description: "Intercambia, presta y dona recursos académicos dentro de tu campus.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body><AppTheme>{children}</AppTheme></body>
    </html>
  );
}
