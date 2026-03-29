"use client";

import DashboardLayout from "../components/layout/DashboardLayout";
import { useEffect, useState, useCallback } from "react";
import { getIrrigationHistory, getReportStats, IrrigationEvent, ReportStats } from "../../lib/api";
import { useSocket } from "../../lib/useSocket";

function LogCard({ event }: { event: IrrigationEvent }) {
  const isStart = event.type === "start";
  const date = new Date(event.timestamp);
  
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isStart ? "bg-green-100" : "bg-red-100"}`}>
          {isStart ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-gray-900 text-[15px]">
              Pump {isStart ? "Started" : "Stopped"}
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isStart ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {event.zone}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${event.trigger === "manual" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
              {event.trigger === "manual" ? "Manual" : "Auto"}
            </span>
          </div>
          <p className="text-gray-500 text-[13px]">
            {isStart 
              ? `Irrigation activated. Moisture: ${event.moisture}%, Temp: ${event.temperature}°C`
              : `Irrigation completed. Final moisture: ${event.moisture}%`
            }
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[14px] font-bold text-gray-900">
            {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
          </div>
          <div className="text-[11px] text-gray-400">
            {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, subtitle, icon, color }: { title: string; value: string | number; subtitle: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center`}>{icon}</div>
      </div>
      <div className="text-[28px] font-extrabold text-gray-900 tracking-tight">{value}</div>
      <div className="text-[13px] font-semibold text-gray-500 mt-1">{title}</div>
      <div className="text-[11px] text-gray-400">{subtitle}</div>
    </div>
  );
}

export default function LogsPage() {
  const [events, setEvents] = useState<IrrigationEvent[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "start" | "stop">("all");
  const { isConnected } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      const [historyRes, statsRes] = await Promise.all([
        getIrrigationHistory(100).catch(() => ({ events: [] })),
        getReportStats().catch(() => null),
      ]);
      setEvents(historyRes.events || []);
      setStats(statsRes);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredEvents = events.filter(e => {
    if (filter === "all") return true;
    return e.type === filter;
  });

  const startCount = events.filter(e => e.type === "start").length;
  const manualCount = events.filter(e => e.trigger === "manual").length;
  const autoCount = events.filter(e => e.trigger !== "manual").length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-64 flex items-center justify-center text-gray-500">Loading logs...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <h1 className="text-[20px] font-extrabold text-gray-900 tracking-tight">Irrigation Logs</h1>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-[#3CC15A]" : "bg-gray-400"}`}></div>
            <span className={`text-[10px] font-bold ${isConnected ? "text-[#3CC15A]" : "text-gray-400"}`}>
              {isConnected ? "Live" : "Connecting..."}
            </span>
          </div>
        </div>
        <p className="text-gray-500 text-[13px] font-medium">
          Complete history of pump operations and irrigation events
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Irrigations"
          value={startCount}
          subtitle="Pump activations"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>}
          color="bg-blue-500"
        />
        <StatsCard
          title="Pump Runtime"
          value={`${stats?.last24h?.pumpOnTime || 0}m`}
          subtitle="Last 24 hours"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          color="bg-green-500"
        />
        <StatsCard
          title="Manual Control"
          value={manualCount}
          subtitle="User triggered"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg>}
          color="bg-purple-500"
        />
        <StatsCard
          title="Auto Triggered"
          value={autoCount}
          subtitle="Sensor based"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>}
          color="bg-amber-500"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "all", label: "All Events" },
          { key: "start", label: "Pump Start" },
          { key: "stop", label: "Pump Stop" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              filter === tab.key 
                ? "bg-[#3CC15A] text-white shadow-sm" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
            </div>
            <h3 className="font-bold text-gray-700 mb-2">No Irrigation Events</h3>
            <p className="text-gray-400 text-[13px]">Pump activity will appear here when irrigation events occur.</p>
          </div>
        ) : (
          filteredEvents.map((event, i) => (
            <LogCard key={i} event={event} />
          ))
        )}
      </div>
    </DashboardLayout>
  );
}