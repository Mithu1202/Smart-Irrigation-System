"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const pathParts = pathname.split("/").filter(Boolean);
  const currentPage = pathParts.length > 0 ? pathParts[pathParts.length - 1] : "";
  const titleText = currentPage ? currentPage.charAt(0).toUpperCase() + currentPage.slice(1) : "Dashboard";

  return (
    <header className="flex justify-between items-center py-6 px-8 bg-[#f5f6f8]">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm font-medium">
        <span className="text-gray-400">ZoneHub /&nbsp;</span>
        <span className="text-gray-900 font-bold">{titleText}</span>
      </div>

      {/* Elements Section */}
      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="relative hidden md:block w-64">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <input
            type="text"
            placeholder="Search zones..."
            className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3CC15A]"
          />
        </div>

        {/* Notifications */}
        <button className="relative bg-[#f0f1f4] p-2.5 rounded-full hover:bg-gray-200 transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-[#E74C3C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#f5f6f8]">
            4
          </span>
        </button>

        {/* User Profile */}
        <div className="flex items-center cursor-pointer bg-white border border-gray-100 p-1.5 pr-3 rounded-[14px] hover:shadow-sm transition gap-3">
          <div className="w-9 h-9 bg-gray-300 rounded-[10px] overflow-hidden">
            {/* Generic placeholder logic for avatar if image not present */}
            <img src="https://ui-avatars.com/api/?name=Mithu+FT&background=random" alt="User" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 leading-tight">Mithu FT</span>
            <span className="text-xs font-medium text-gray-400">@mithuu</span>
          </div>
          <svg className="ml-2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </div>
    </header>
  );
}