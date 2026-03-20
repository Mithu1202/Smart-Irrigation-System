"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menu = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Zones", path: "/zones" },
  { name: "Alerts", path: "#" },
  { name: "System Status", path: "#" },
  { name: "Irrigation Control", path: "#" },
  { name: "Reports", path: "#" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white p-6 border-r border-gray-100">
      <div className="text-xl font-semibold mb-8">
        <img src="/logo.svg" alt="ZoneHub Logo" className="w-10 h-10 inline-block mr-3" />
        <span className="text-green-600">Zone</span>Hub
      </div>

      <div className="text-xs text-gray-400 mb-3">GENERAL</div>

      <nav className="space-y-2">
        {menu.map((item) => {
          const active = pathname === item.path;

          return (
            <Link
              key={item.name}
              href={item.path}
              className={`block px-4 py-2 rounded-lg text-sm transition ${
                active
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}