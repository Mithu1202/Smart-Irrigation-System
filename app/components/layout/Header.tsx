"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "../ThemeToggle";
import { useState, useEffect, useRef } from "react";
import { getIrrigationLogs } from "../../../lib/api";
import { useSocket } from "../../../lib/useSocket";

export default function Header({ 
  onOpenSidebar, 
  isDesktop = false 
}: { 
  onOpenSidebar?: () => void;
  isDesktop?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const pathParts = pathname.split("/").filter(Boolean);
  const currentPage = pathParts.length > 0 ? pathParts[pathParts.length - 1] : "";
  const titleText = currentPage ? currentPage.charAt(0).toUpperCase() + currentPage.slice(1) : "Dashboard";

  const [user, setUser] = useState<{name: string, handle: string} | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Load user from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Support both old format (name) and new backend format (fullName)
        const displayName = parsed.fullName || parsed.name || "Smart Farmer";
        const displayHandle = parsed.handle || "@" + displayName.split(" ")[0].toLowerCase();
        setUser({ name: displayName, handle: displayHandle });
      } catch (e) {}
    } else {
      setUser({ name: "Smart Farmer", handle: "@farmer" });
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const [notifications, setNotifications] = useState<any[]>([]);
  const { isConnected, latestData } = useSocket();

  // Load historical notifications (Pump events)
  useEffect(() => {
    async function loadLogs() {
      try {
        const logs = await getIrrigationLogs();
        const formatted = logs.slice(0, 4).map((log: any) => {
          const d = new Date(log.timestamp);
          return {
            id: log._id,
            title: `Pump in ${log.zone || "Zone A"} is ${log.status}`,
            time: isNaN(d.getTime()) ? "Just now" : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: log.status === "ON" ? "info" : "gray"
          };
        });
        setNotifications(formatted);
      } catch (e) {}
    }
    loadLogs();
  }, []);

  // Handle Real-time Alerts from Socket
  useEffect(() => {
    if (latestData && latestData.soilMoisture < 20) {
      const lowMoistureAlert = {
        id: Date.now(),
        title: `CRITICAL: Low Moisture (${latestData.soilMoisture}%)`,
        time: "Just now",
        type: "critical"
      };
      setNotifications(prev => [lowMoistureAlert, ...prev.slice(0, 3)]);
    }
  }, [latestData]);

  const unreadCount = notifications.length;

  const getProfileImage = () => {
    const name = user?.name || "SF";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3CC15A&color=fff&bold=true`;
  };

  const NotificationDropdown = () => (
    <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 dark:border-slate-700 overflow-hidden z-50">
      <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
        <h4 className="font-bold text-gray-900 dark:text-gray-100">Notifications</h4>
        <span className="text-xs font-semibold bg-[#3CC15A] text-white px-2 py-0.5 rounded-full">{unreadCount} New</span>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No new notifications</div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className="p-4 border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer flex gap-3">
              <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${n.type === 'critical' ? 'bg-[#E74C3C]' : n.type === 'warning' ? 'bg-[#F39C12]' : 'bg-[#3CC15A]'}`} />
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{n.title}</p>
                <p className="text-xs text-gray-400 mt-1">{n.time}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <Link href="/alerts" className="block text-center p-3 text-sm font-semibold text-[#3CC15A] hover:bg-[#3CC15A]/10 transition">
        View All Alerts
      </Link>
    </div>
  );

  const ProfileDropdown = () => (
    <div className="absolute right-0 top-14 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 dark:border-slate-700 overflow-hidden z-50 py-1.5">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 mb-1">
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{user?.name}</p>
        <p className="text-xs font-medium text-gray-500">{user?.handle}</p>
      </div>
      <Link href="/settings" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
        <svg className="w-4 h-4 mr-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
        Account Settings
      </Link>
      <Link href="/help" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
        <svg className="w-4 h-4 mr-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Help & Center
      </Link>
      <div className="h-px bg-gray-100 dark:bg-slate-700 my-1"></div>
      <button onClick={handleLogout} className="w-full text-left flex items-center px-4 py-2.5 text-sm font-semibold text-[#E74C3C] hover:bg-[#E74C3C]/10 transition">
        <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Logout
      </button>
    </div>
  );

  if (isDesktop) {
    return (
      <header className="flex justify-between items-center py-6 px-8 bg-[#f5f6f8] dark:bg-slate-800 transition-colors">
        {/* Breadcrumbs */}
        <div className="flex items-center text-sm font-medium">
          <span className="text-gray-400 dark:text-gray-500">ZoneHub /&nbsp;</span>
          <span className="text-gray-900 dark:text-gray-100 font-bold">{titleText}</span>
        </div>

        {/* Elements Section */}
        <div className="flex items-center gap-6">
          {/* Search */}
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <input
              type="text"
              placeholder="Search zones..."
              className="w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3CC15A] transition-colors"
            />
          </div>

          {/* Theme Toggle */}
          <ThemeToggle variant="icon" />

          {/* Notifications */}
          <div className="relative" ref={notifMenuRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative bg-[#f0f1f4] dark:bg-slate-700 p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-[#E74C3C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#f5f6f8] dark:border-slate-800">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && <NotificationDropdown />}
          </div>

          {/* User Profile */}
          <div className="relative" ref={profileMenuRef}>
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 p-1.5 pr-3 rounded-[14px] hover:shadow-sm dark:hover:shadow-md transition gap-3 focus:outline-none"
            >
              <div className="w-9 h-9 bg-gray-300 rounded-[10px] overflow-hidden">
                <img src={getProfileImage()} alt="User" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{user?.name || "Loading..."}</span>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{user?.handle || "@user"}</span>
              </div>
              <svg className={`ml-2 text-gray-400 dark:text-gray-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            {showProfileMenu && <ProfileDropdown />}
          </div>
        </div>
      </header>
    );
  }

  // MOBILE HEADER
  return (
    <header className="flex justify-between items-center px-5 py-3 bg-[#F4F5F4] dark:bg-slate-800 shrink-0 z-10 w-full relative transition-colors">
      <div className="flex items-center gap-3">
        <button onClick={onOpenSidebar} className="text-gray-900 dark:text-gray-100 focus:outline-none">
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
          <span className="text-[17px] font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Zone<span className="text-[#3CC15A] font-semibold">Hub</span></span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle variant="icon" />

        <div className="relative" ref={notifMenuRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none transition-colors mt-1"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border border-[#F4F5F4] dark:border-slate-800 rounded-full flex items-center justify-center">
                  <span className="text-[7px] text-white font-bold leading-none select-none">{unreadCount}</span>
                </div>
              )}
            </button>
            {showNotifications && (
               <div className="fixed left-5 right-5 top-16 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50">
                 <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                   <h4 className="font-bold text-gray-900 dark:text-gray-100">Notifications</h4>
                   <span className="text-xs font-semibold bg-[#3CC15A] text-white px-2 py-0.5 rounded-full">{unreadCount} New</span>
                 </div>
                 <div className="max-h-80 overflow-y-auto">
                   {dummyNotifications.map(n => (
                     <div key={n.id} className="p-3.5 border-b border-gray-50 dark:border-slate-700/50 flex gap-3">
                       <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${n.type === 'critical' ? 'bg-[#E74C3C]' : n.type === 'warning' ? 'bg-[#F39C12]' : 'bg-[#3CC15A]'}`} />
                       <div>
                         <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">{n.title}</p>
                         <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                       </div>
                     </div>
                   ))}
                 </div>
                 <Link href="/alerts" className="block text-center p-3 text-sm font-semibold text-[#3CC15A] bg-white dark:bg-slate-800">
                   View All Alerts
                 </Link>
               </div>
            )}
        </div>

        <div className="relative" ref={profileMenuRef}>
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-8 h-8 rounded-full overflow-hidden shadow-sm cursor-pointer border border-[#F4F5F4] dark:border-slate-700 focus:outline-none"
            >
              <img src={getProfileImage()} alt="User" className="w-full h-full object-cover" />
            </button>
            {showProfileMenu && (
              <div className="fixed right-5 top-16 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50 py-1.5">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 mb-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{user?.name}</p>
                  <p className="text-xs font-medium text-gray-500">{user?.handle}</p>
                </div>
                <Link href="/settings" className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <svg className="w-4 h-4 mr-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                  Account Settings
                </Link>
                <div className="h-px bg-gray-100 dark:bg-slate-700 my-1"></div>
                <button onClick={handleLogout} className="w-full text-left flex items-center px-4 py-3 text-sm font-semibold text-[#E74C3C]">
                  <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Logout
                </button>
              </div>
            )}
        </div>
      </div>
    </header>
  );
}