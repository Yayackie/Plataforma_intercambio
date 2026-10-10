import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
