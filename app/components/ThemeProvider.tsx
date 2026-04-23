"use client";

import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Get saved theme or detect system preference
    const saved = localStorage.getItem("theme");
    const isDarkPreferred = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const shouldBeDark = saved ? saved === "dark" : isDarkPreferred;
    
    // Apply theme to HTML element
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return <>{children}</>;
}
