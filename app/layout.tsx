import "../styles/globals.css";
import type { Metadata } from "next";

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
      <body className="bg-gray-100 text-gray-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}