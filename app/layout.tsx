import "../styles/globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "./components/ThemeProvider";

export const metadata: Metadata = {
  title: "ZoneHub",
  description: "Smart Zone Monitoring Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-100 dark:bg-slate-900 text-gray-900 dark:text-gray-100 transition-colors" suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}