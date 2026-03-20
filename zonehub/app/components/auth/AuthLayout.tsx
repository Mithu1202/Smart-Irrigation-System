import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Left Panel - Branding (Hidden on strict mobile, shown on md and above) */}
      <div className="hidden md:flex md:w-[45%] lg:w-[50%] bg-[#127E36] flex-col relative z-10">
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

        {/* Dashboard Composite Mockup */}
        <div className="flex-1 relative mt-16 flex justify-center items-center z-10 w-full overflow-visible">
          {/* Main Dashboard Image */}
          <div className="relative w-[75%] ml-[10%] drop-shadow-2xl">
            <img
              src="/dashboard-preview.png"
              alt="Dashboard Preview"
              className="w-full h-auto rounded-l-[2rem] object-cover"
            />

            {/* Floating Leaf Icon Card (Top Right) */}
            <div className="absolute -top-12 -right-4 lg:-right-8 w-24 sm:w-28 md:w-32 drop-shadow-xl rounded-3xl overflow-hidden ">
              <img
                src="/leaf-icon-card.png"
                alt="Leaf Icon"
                className="w-full h-auto"
              />
            </div>

            {/* Floating Zone Selector Card (Bottom Left) */}
            <div className="absolute bottom-4 -left-12 lg:-left-24 w-48 sm:w-56 md:w-64 drop-shadow-2xl rounded-[1.5rem] overflow-hidden bg-white">
              <img
                src="/zone-selector-card.png"
                alt="Zone Selector"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 z-0" />
      </div>

      {/* Right Panel - Form (Takes full width on mobile, half on desktop) */}
      <div className="w-full md:w-[55%] lg:w-[50%] flex flex-col justify-between bg-white px-8 sm:px-16 md:px-20 lg:px-32 py-12">
        <div className="flex-1 flex flex-col justify-center">
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm font-medium">
            © 2026 ZoneHub. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
