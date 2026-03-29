"use client";

import DashboardLayout from "../components/layout/DashboardLayout";
import { useEffect, useState, useCallback } from "react";
import { getAlertsHistory, AlertData } from "../../lib/api";
import { useSocket } from "../../lib/useSocket";

function AlertCard({ alert }: { alert: AlertData }) {
  const isCritical = alert.type === "critical";
  const date = new Date(alert.timestamp);
  
  return (
    <div className={`rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md ${
      isCritical ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
    }`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
          isCritical ? "bg-red-100" : "bg-amber-100"
        }`}>
          {isCritical ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-gray-900 text-[15px]">{alert.title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isCritical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
            }`}>
              {alert.type.toUpperCase()}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {alert.zone}
            </span>
          </div>
          <p className="text-gray-600 text-[13px] mb-2">{alert.message}</p>
          <div className="flex items-center gap-4 text-[11px] text-gray-500">
            <span>Value: <strong className="text-gray-700">{alert.value}</strong></span>
            <span>Threshold: <strong className="text-gray-700">{alert.threshold}</strong></span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[14px] font-bold text-gray-900">
            {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
          </div>
          <div className="text-[11px] text-gray-400">
            {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, color, icon }: { title: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3">
        <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center`}>{icon}</div>
        <div>
          <div className="text-[28px] font-extrabold text-gray-900">{value}</div>
          <div className="text-[13px] text-gray-500 font-medium">{title}</div>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "critical" | "warning">("all");
  const { isConnected, alerts: liveAlerts } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      const res = await getAlertsHistory(100).catch(() => ({ alerts: [] }));
      setAlerts(res.alerts || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Merge live alerts with historical alerts
  const allAlerts = [...alerts];
  liveAlerts.forEach(live => {
    const exists = allAlerts.some(a => 
      a.title === live.title && 
      Math.abs(new Date(a.timestamp).getTime() - (live.timestamp?.getTime() || 0)) < 60000
    );
    if (!exists && live.timestamp) {
      allAlerts.unshift({
        type: live.type === "critical" ? "critical" : "warning",
        title: live.title,
        message: live.message,
        zone: live.zone,
        value: live.value,
        threshold: live.threshold,
        timestamp: live.timestamp.toISOString(),
      });
    }
  });

  const filteredAlerts = allAlerts.filter(a => {
    if (filter === "all") return true;
    return a.type === filter;
  });

  const criticalCount = allAlerts.filter(a => a.type === "critical").length;
  const warningCount = allAlerts.filter(a => a.type === "warning").length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-64 flex items-center justify-center text-gray-500">Loading alerts...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <h1 className="text-[20px] font-extrabold text-gray-900 tracking-tight">System Alerts</h1>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-[#3CC15A]" : "bg-gray-400"}`}></div>
            <span className={`text-[10px] font-bold ${isConnected ? "text-[#3CC15A]" : "text-gray-400"}`}>
              {isConnected ? "Live Monitoring" : "Connecting..."}
            </span>
          </div>
        </div>
        <p className="text-gray-500 text-[13px] font-medium">
          Monitor critical alerts and system warnings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Alerts"
          value={allAlerts.length}
          color="bg-blue-500"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
        />
        <StatsCard
          title="Critical"
          value={criticalCount}
          color="bg-red-500"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
        />
        <StatsCard
          title="Warnings"
          value={warningCount}
          color="bg-amber-500"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        />
        <StatsCard
          title="Today"
          value={allAlerts.filter(a => {
            const d = new Date(a.timestamp);
            const today = new Date();
            return d.toDateString() === today.toDateString();
          }).length}
          color="bg-green-500"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "all", label: "All Alerts", count: allAlerts.length },
          { key: "critical", label: "Critical", count: criticalCount },
          { key: "warning", label: "Warnings", count: warningCount },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all flex items-center gap-2 ${
              filter === tab.key 
                ? "bg-[#3CC15A] text-white shadow-sm" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              filter === tab.key ? "bg-white/20" : "bg-gray-200"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-green-50 rounded-2xl p-12 text-center border border-green-200">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3 className="font-bold text-green-800 mb-2">All Clear!</h3>
            <p className="text-green-600 text-[13px]">No alerts at the moment. Your system is running smoothly.</p>
          </div>
        ) : (
          filteredAlerts.map((alert, i) => (
            <AlertCard key={i} alert={alert} />
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
