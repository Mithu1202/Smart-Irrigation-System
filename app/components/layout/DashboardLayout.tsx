"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";
import { useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      {/* 
          DESKTOP LAYOUT (md and up)
      */}
      <div className="hidden md:block min-h-screen bg-gray-50 dark:bg-slate-900 p-6 font-sans transition-colors">
        <div className="flex bg-white dark:bg-slate-800 rounded-[22px] overflow-hidden shadow-sm border border-gray-100 dark:border-slate-700 min-h-[calc(100vh-3rem)]">
          {/* Desktop Sidebar */}
          <Sidebar isOpen={false} onClose={() => {}} isDesktop={true} />

          <div className="flex-1 bg-[#f5f6f8] dark:bg-slate-900 flex flex-col h-[calc(100vh-3rem)] overflow-hidden transition-colors">
            {/* Desktop Header */}
            <Header onOpenSidebar={() => {}} isDesktop={true} />
            
            {/* Desktop Scrollable Content Area */}
            <div className="p-8 overflow-y-auto flex-1 hide-scrollbar">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* 
          MOBILE LAYOUT (strictly < md)
      */}
      <div className="flex md:hidden min-h-screen bg-[#2D2D2D] dark:bg-slate-950 items-center justify-center font-sans tracking-tight">
        <div className="w-full h-[100dvh] max-w-[390px] bg-[#F4F5F4] dark:bg-slate-800 shadow-2xl flex flex-col relative mx-auto overflow-hidden transition-colors">
          {/* iOS Status Bar Mockup */}
          <div className="px-6 py-3.5 flex justify-between items-center text-black dark:text-gray-100 font-semibold text-[15px] z-10 shrink-0 bg-[#F4F5F4] dark:bg-slate-800 transition-colors">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
                <path d="M1 9.5C1 8.67157 1.67157 8 2.5 8H3.5C4.32843 8 5 8.67157 5 9.5V11H1V9.5Z" />
                <path d="M7 6.5C7 5.67157 7.67157 5 8.5 5H9.5C10.3284 5 11 5.67157 11 6.5V11H7V6.5Z" />
                <path d="M13 3.5C13 2.67157 13.6715 2 14.5 2H15.5C16.3284 2 17 2.67157 17 3.5V11H13V3.5Z" />
              </svg>
              <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
                <path d="M8 0C4.5 0 1.5 1.5 0 3L8 12L16 3C14.5 1.5 11.5 0 8 0Z" />
              </svg>
              <svg width="25" height="12" viewBox="0 0 25 12" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="0.5" y="0.5" width="20" height="11" rx="2.5" />
                <rect x="2" y="2" width="14" height="8" rx="1" fill="currentColor" />
                <path d="M22 4V8" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </div>
          </div>

          <Header onOpenSidebar={() => setIsSidebarOpen(true)} isDesktop={false} />
          
          <div className="flex-1 overflow-y-auto px-5 pt-3 pb-8 hide-scrollbar relative z-0 bg-[#F4F5F4] dark:bg-slate-800 transition-colors">
            {children}
          </div>

          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isDesktop={false} />
        </div>
      </div>
    </>
  );
}
