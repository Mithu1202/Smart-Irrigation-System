"use client";

import { useEffect, useState, useCallback } from "react";

export function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "button" }) {
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Set mounted state
    setIsMounted(true);

    // Check current theme
    const dark = document.documentElement.classList.contains("dark");
    setIsDark(dark);
  }, []);

  const handleToggle = useCallback(() => {
    console.log("Toggle clicked!");
    
    const html = document.documentElement;
    const currentlyDark = html.classList.contains("dark");
    
    console.log("Currently dark:", currentlyDark);
    
    if (currentlyDark) {
      console.log("Switching to light mode");
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      console.log("Switching to dark mode");
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  }, []);

  if (!isMounted) return null;

  const baseClasses = "p-2 rounded-lg transition-colors cursor-pointer";
  const darkClasses = isDark
    ? "bg-slate-700 text-gray-200 hover:bg-slate-600"
    : "bg-gray-100 text-gray-700 hover:bg-gray-200";

  return (
    <button
      onClick={handleToggle}
      className={`${baseClasses} ${darkClasses}`}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      type="button"
    >
      {isDark ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  );
}
