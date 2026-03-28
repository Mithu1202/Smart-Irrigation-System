"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const pathname = usePathname();

  return (
    <header className="flex justify-between items-center px-5 py-3 bg-[#F4F5F4] shrink-0 z-10 w-full relative">
      <div className="flex items-center gap-3">
        <button onClick={onOpenSidebar} className="text-gray-900 focus:outline-none">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex items-center gap-1.5 ml-1">
          <div className="bg-[#3CC15A] w-7 h-7 rounded-lg flex items-center justify-center shadow-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
              <path d="M12 22C12 22 4 16 4 9C4 5.5 6.5 3 10 3C17 3 20 8 20 8C20 8 12 14 12 22Z" />
            </svg>
          </div>
          <span className="text-[17px] font-extrabold tracking-tight text-gray-900">Zone<span className="text-[#3CC15A] font-semibold">Hub</span></span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative text-gray-500 hover:text-gray-700 focus:outline-none">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-[#F4F5F4] rounded-full flex items-center justify-center">
            <span className="text-[6px] text-white font-bold leading-none select-none -translate-x-px">2</span>
          </div>
        </button>

        <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm cursor-pointer border border-[#F4F5F4]">
          <img src="https://ui-avatars.com/api/?name=Mithu+FT&background=random" alt="User" className="w-full h-full object-cover" />
        </div>
      </div>
    </header>
  );
}