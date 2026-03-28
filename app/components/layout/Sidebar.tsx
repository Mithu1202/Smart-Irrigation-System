"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const generalMenu = [
  { name: "Home", path: "/dashboard", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
  { name: "Zones", path: "/zones", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
  { name: "Alerts", path: "/alerts", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> },
  { name: "System Status", path: "/status", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
  { name: "Reports", path: "/reports", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg> },
];

const accountMenu = [
  { name: "Settings", path: "/settings", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> },
  { name: "Help & Center", path: "/help", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
  { name: "Logout", path: "/login", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg> },
];

export default function Sidebar({ isOpen = false, onClose = () => {} }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="absolute inset-0 bg-black/40 z-40 transition-opacity"
          onClick={onClose}
        ></div>
      )}

      {/* Slide-over Drawer */}
      <aside 
        className={`absolute top-0 left-0 bottom-0 w-[82%] sm:w-[320px] bg-white z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl flex flex-col p-6 rounded-r-3xl`}
      >
        <div className="flex justify-between items-center mb-8">
          <span className="text-[17px] font-extrabold tracking-tight text-gray-900 ml-1">Menu</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 focus:outline-none bg-gray-50 p-1.5 rounded-full">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* General Menu */}
        <nav className="space-y-2.5 mb-8">
          {generalMenu.map((item) => {
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={onClose}
                className={`flex items-center px-3 py-1.5 text-[15px] font-medium transition-all text-gray-500 hover:text-gray-900`}
              >
                <div className="mr-5 text-gray-400">{item.icon}</div>
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <hr className="border-gray-100 mb-8 w-1/4 ml-4" />

        {/* Account Menu */}
        <nav className="space-y-2.5">
          {accountMenu.map((item) => {
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={onClose}
                className="flex items-center px-3 py-1.5 text-[15px] font-medium text-gray-500 hover:text-gray-900 transition-all"
              >
                <div className="mr-5 text-gray-400">{item.icon}</div>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}