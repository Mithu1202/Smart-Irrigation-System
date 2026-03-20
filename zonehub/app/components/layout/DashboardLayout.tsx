"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen p-6">
      <div className="flex bg-white rounded-[22px] overflow-hidden shadow-2xl">
        <Sidebar />

        <div className="flex-1 bg-[#f5f6f8]">
          <Header />
          <div className="p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}