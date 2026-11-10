"use client";
import { ThemeProvider } from "next-themes";
export function AppTheme({children}:{children:React.ReactNode}) {
  return <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="campus-theme" disableTransitionOnChange>{children}</ThemeProvider>;
}
