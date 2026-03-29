"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const generalMenu = [
  { name: "Home Dashboard", path: "/dashboard", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg> },
  { name: "Live Map", path: "/map", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg> },
  { name: "Zones", path: "/zones", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg> },
  { name: "Irrigation Logs", path: "/logs", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.423L16 11" /><rect x="2" y="6" width="14" height="12" rx="2" /></svg> },
  { name: "Alerts", path: "/alerts", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
];

const accountMenu = [
  { name: "Settings", path: "/settings", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> },
  { name: "Help & Center", path: "/help", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
  { name: "Logout", path: "/login", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg> },
];

export default function Sidebar({ 
  isOpen = false, 
  onClose = () => {},
  isDesktop = false 
}: { 
  isOpen?: boolean; 
  onClose?: () => void;
  isDesktop?: boolean;
}) {
  const pathname = usePathname();

  if (isDesktop) {
    return (
      <aside className="w-[280px] bg-white flex flex-col p-6 overflow-y-auto border-r border-gray-100 shrink-0">
        {/* Logo */}
        <div className="flex items-center mb-10 pl-2">
          <div className="p-1 rounded-lg flex items-center justify-center mr-3">
            <Image src="/logo.svg" alt="ZoneHub" width={40} height={30} />
          </div>
          <span className="text-[#101828] text-2xl font-bold tracking-tight">Zone<span className="text-[#3CC15A] text-2xl font-bold tracking-tight">Hub</span></span>
        </div>

        {/* General Menu */}
        <div className="text-[11px] font-bold text-gray-400 mb-4 tracking-wider pl-2 uppercase">GENERAL</div>
        <nav className="space-y-1.5 mb-8">
          {generalMenu.map((item) => {
            const active = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center px-4 py-3 rounded-xl text-[14px] font-medium transition-all ${active
                  ? "bg-[#3CC15A] text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                <div className="mr-3">{item.icon}</div>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Account Menu */}
        <div className="text-[11px] font-bold text-gray-400 mb-4 tracking-wider pl-2 uppercase">ACCOUNT</div>
        <nav className="space-y-1.5">
          {accountMenu.map((item) => {
            return (
              <Link
                key={item.name}
                href={item.path}
                className="flex items-center px-4 py-3 rounded-xl text-[14px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all"
              >
                <div className="mr-3">{item.icon}</div>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>
    );
  }

  // MOBILE SIDEBAR
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