import React from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 
        DESKTOP LAYOUT (md and up) 
      */}
      <div className="hidden md:flex min-h-screen bg-gray-50 overflow-x-hidden">
        {/* Left Panel - Branding */}
        <div className="md:flex md:w-[45%] lg:w-[50%] bg-[#127E36] flex-col relative z-10 shrink-0">
          {/* Logo Section */}
          <div className="flex items-center justify-center pt-16 pb-8 z-10">
            <div className="bg-white p-2 rounded-xl flex items-center justify-center mr-3 shadow-sm">
              <Image src="/mainLogo.svg" alt="ZoneHub" width={28} height={28} />
            </div>
            <span className="text-white text-3xl font-bold tracking-tight">ZoneHub</span>
          </div>

          {/* Text Section */}
          <div className="flex flex-col items-center justify-center px-12 text-center z-10">
            <h1 className="text-white text-[2.5rem] font-bold leading-tight mb-3">
              Welcome to ZoneHub
            </h1>
            <p className="text-emerald-100 text-lg max-w-md font-medium">
              Manage your farm with precision irrigation control.
            </p>
          </div>

          <div className="flex-1 relative mt-16 flex justify-center items-center z-10 w-full overflow-visible">
            <div className="relative w-[75%] ml-[10%] drop-shadow-2xl">
              <img src="/dashboard-preview.png" alt="Dashboard Preview" className="w-full h-auto rounded-l-[2rem] object-cover" />
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 z-0" />
        </div>

        {/* Right Panel - Form Container */}
        <div className="w-full md:w-[55%] lg:w-[50%] flex flex-col justify-between bg-white px-8 sm:px-16 md:px-20 lg:px-32 py-12 shrink-0 overflow-y-auto max-h-screen">
          <div className="flex-1 flex flex-col justify-center">
            {children}
          </div>

          <div className="text-center mt-8 pt-4">
            <p className="text-gray-400 text-sm font-medium">
              © 2026 ZoneHub. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* 
        MOBILE LAYOUT (strictly < md) 
      */}
      <div className="flex md:hidden min-h-screen bg-[#2D2D2D] items-center justify-center font-sans tracking-tight">
        <div className="w-full h-[100dvh] max-w-[390px] bg-[#F4F5F4] shadow-2xl overflow-hidden flex flex-col relative mx-auto">
          {/* iOS Status Bar Mockup */}
          <div className="px-6 py-3.5 flex justify-between items-center text-black font-semibold text-[15px] z-10 shrink-0">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><path d="M1 9.5C1 8.67157 1.67157 8 2.5 8H3.5C4.32843 8 5 8.67157 5 9.5V11H1V9.5Z"/><path d="M7 6.5C7 5.67157 7.67157 5 8.5 5H9.5C10.3284 5 11 5.67157 11 6.5V11H7V6.5Z"/><path d="M13 3.5C13 2.67157 13.6715 2 14.5 2H15.5C16.3284 2 17 2.67157 17 3.5V11H13V3.5Z"/></svg>
              <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 0C4.5 0 1.5 1.5 0 3L8 12L16 3C14.5 1.5 11.5 0 8 0Z"/></svg>
              <svg width="25" height="12" viewBox="0 0 25 12" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="20" height="11" rx="2.5"/><rect x="2" y="2" width="14" height="8" rx="1" fill="currentColor"/><path d="M22 4V8" strokeLinecap="round" strokeWidth="2"/></svg>
            </div>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
