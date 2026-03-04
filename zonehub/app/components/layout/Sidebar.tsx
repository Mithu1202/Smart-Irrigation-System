"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menu = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Zones", path: "/zones" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-green-700 text-white min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-8">ZoneHub</h1>

      <nav className="space-y-4">
        {menu.map((item) => (
          <Link
            key={item.name}
            href={item.path}
            className={`block p-2 rounded-md ${
              pathname === item.path
                ? "bg-green-900"
                : "hover:bg-green-800"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}