"use client";

import DashboardLayout from "../components/layout/DashboardLayout";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  CartesianGrid,
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Legend,
} from "recharts";
import { getEnrichedData, getIrrigationLogs, getLatestData, getZones, togglePump, type EnrichedReading, type IrrigationLogsResponse } from "../../lib/api";
import { useSocket, SensorData } from "../../lib/useSocket";
import AgentPanel from "../components/agent/AgentPanel";
import MLInsightPanel from "../components/dashboard/MLInsightPanel";

const MapWrapper = dynamic(() => import("../components/zones/MapWrapper"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-[20px] bg-[#EAF4ED] flex items-center justify-center animate-pulse">
      <div className="text-gray-500 text-sm font-medium">Loading map...</div>
    </div>
  ),
});

interface Zone {
  zoneId: string;
  name: string;
  coordinates: { lat: number; lng: number };
  status: string;
  soilMoisture?: number;
  temperature?: number;
  humidity?: number;
  pumpActive?: boolean;
  crop?: string;
}

function OverviewCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-[0_1px_10px_-5px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_10px_-5px_rgba(0,0,0,0.3)] transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
            {title}
          </div>
          <div className="mt-1 text-[24px] font-extrabold text-gray-900 dark:text-gray-100 leading-none">
            {value}
          </div>
          <div className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  accent = "emerald",
}: {
  title: string;
  value: string;
  subtitle: string;
  accent?: "emerald" | "blue" | "amber" | "violet";
}) {
  const accents = {
    emerald: "bg-[#F3FBF5] dark:bg-emerald-950/40 border-[#D7F0DD] dark:border-emerald-800/60 text-[#2F8F43] dark:text-emerald-400",
    blue: "bg-[#F5F9FF] dark:bg-blue-950/40 border-[#D9E7FF] dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400",
    amber: "bg-[#FFF9EC] dark:bg-amber-950/40 border-[#F7E3B1] dark:border-amber-800/60 text-[#B45309] dark:text-amber-400",
    violet: "bg-[#F8F5FF] dark:bg-violet-950/40 border-[#E7DBFF] dark:border-violet-800/60 text-[#7C3AED] dark:text-violet-400",
  };

  return (
    <div className={`rounded-[20px] border p-4 shadow-[0_1px_10px_-5px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_10px_-5px_rgba(0,0,0,0.3)] transition-colors ${accents[accent]}`}>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">{title}</div>
      <div className="mt-2 text-[30px] font-extrabold text-gray-900 dark:text-gray-100 leading-none">{value}</div>
      <div className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">{subtitle}</div>
    </div>
  );
}

function ZoneSelectorCard({
  zones,
  selectedZone,
  onZoneSelect,
}: {
  zones: Zone[];
  selectedZone: string;
  onZoneSelect: (zone: string) => void;
}) {
  const validZones = zones.filter(
    (z) => z.coordinates?.lat && z.coordinates?.lng && z.coordinates.lat !== 0
  );

  return (
    <div className="rounded-[24px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] transition-colors">
      <div className="mb-4 rounded-[20px] overflow-hidden relative w-full h-[420px] bg-[#E8F2EC] dark:bg-slate-700">
        {validZones.length > 0 ? (
          <MapWrapper
            zones={validZones}
            selectedZone={selectedZone !== "default" ? selectedZone : undefined}
            onZoneSelect={onZoneSelect}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-4">
              <div className="text-2xl mb-1">🗺️</div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">No zones configured</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-bold tracking-tight text-gray-900 dark:text-gray-100 text-[15px]">
            Zone Selector
          </h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
            Pick a zone to update the map, metrics, and AI assistant.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative min-w-[220px]">
            <select
              value={selectedZone}
              onChange={(e) => onZoneSelect(e.target.value)}
              className="w-full appearance-none bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-[13px] font-semibold py-3 px-4 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-[#3CC15A] shadow-sm cursor-pointer transition-colors"
            >
              <option value="default">All zones</option>
              {zones.map((zone) => (
                <option key={zone.zoneId} value={zone.zoneId}>
                  {zone.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>

          <Link
            href="/zones"
            className="inline-flex items-center justify-center gap-2 bg-[#39B54A] text-white py-3.5 px-5 rounded-[14px] font-bold text-[14px] shadow-sm transition hover:bg-[#2ea33e]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20" />
              <path d="M2 12h20" />
            </svg>
            Measure Moisture & Temp
          </Link>
        </div>
      </div>
    </div>
  );
}

function DataTableCard({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: any[];
  emptyText: string;
}) {
  const recentLogs = items.slice(0, 5).map(log => {
    const d = new Date(log.timestamp);
    const timeStr = isNaN(d.getTime()) ? "Just now" : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return {
      label: log.zone || "Zone A",
      value: log.status || "OFF",
      meta: timeStr,
      tone: log.status === "ON" ? "green" : "gray" as const,
      id: log._id || Math.random()
    };
  });

  return (
    <div className="rounded-[24px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-[15px]">{title}</h3>
        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.14em]">
          Live
        </span>
      </div>
      {recentLogs.length === 0 ? (
        <div className="text-[13px] text-gray-500 dark:text-gray-400 py-6">{emptyText}</div>
      ) : (
        <div className="space-y-3">
          {recentLogs.map((item) => (
            <div key={item.id !== undefined ? item.id : `${item.label}-${item.value}`} className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-700 pb-3 last:border-b-0 last:pb-0">
              <div>
                <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{item.label}</div>
                {item.meta ? <div className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{item.meta}</div> : null}
              </div>
              <div
                className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${
                  item.tone === "green"
                    ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                    : item.tone === "red"
                    ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400"
                    : item.tone === "amber"
                    ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendChartCard({
  data,
  title,
  subtitle,
}: {
  data: EnrichedReading[];
  title: string;
  subtitle: string;
}) {
  const chartPoints = data
    .filter(entry => entry.timestamp && !isNaN(new Date(entry.timestamp).getTime()))
    .map((entry) => ({
      time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      moisture: entry.soilMoisture,
      gap: entry.thresholdGap,
      stress: entry.waterStressIndex,
    }));

  return (
    <div className="rounded-[24px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] transition-colors">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-[15px]">{title}</h3>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
      </div>
      <div className="h-[280px]">
        {chartPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartPoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <Tooltip
                contentStyle={{
                  borderRadius: "14px",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                }}
              />
              <Line type="monotone" dataKey="moisture" name="Moisture" stroke="#39B54A" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="gap" name="Threshold Gap" stroke="#F59E0B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="stress" name="Stress Index" stroke="#EF4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full rounded-[18px] border border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 dark:text-gray-500 text-[13px]">
            No enriched data yet for this zone.
          </div>
        )}
      </div>
    </div>
  );
}

function RiskDistributionCard({ data }: { data: EnrichedReading[] }) {
  const counts = data.reduce(
    (acc, item) => {
      const key = (item.riskLevel || "LOW").toUpperCase();
      acc[key as "LOW" | "MEDIUM" | "HIGH"] += 1;
      return acc;
    },
    { LOW: 0, MEDIUM: 0, HIGH: 0 }
  );

  const chartData = [
    { name: "Low", value: counts.LOW, color: "#39B54A" },
    { name: "Medium", value: counts.MEDIUM, color: "#F59E0B" },
    { name: "High", value: counts.HIGH, color: "#EF4444" },
  ].filter((item) => item.value > 0);

  return (
    <div className="rounded-[24px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] transition-colors">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-[15px]">Risk Distribution</h3>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">How the recent readings are distributed by risk</p>
      </div>
      <div className="h-[280px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={105}
                paddingAngle={4}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "14px",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full rounded-[18px] border border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 dark:text-gray-500 text-[13px]">
            No risk data available yet.
          </div>
        )}
      </div>
    </div>
  );
}

function ConditionsComparisonCard({ data }: { data: EnrichedReading[] }) {
  const chartData = data
    .filter(entry => entry.timestamp && !isNaN(new Date(entry.timestamp).getTime()))
    .map((entry) => ({
      time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      moisture: entry.soilMoisture,
      temp: entry.temperature,
      hum: entry.humidity,
      raw: entry.soilMoistureRaw
    }));

  return (
    <div className="rounded-[24px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] transition-colors">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-[15px]">Moisture, Temperature, Humidity</h3>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">Three core signals moving together over time</p>
      </div>
      <div className="h-[280px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <Tooltip
                contentStyle={{
                  borderRadius: "14px",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                }}
              />
              <Area type="monotone" dataKey="moisture" stroke="#39B54A" fill="#DDF7E3" fillOpacity={0.8} />
              <Area type="monotone" dataKey="temperature" stroke="#2563EB" fill="#DCEAFF" fillOpacity={0.45} />
              <Area type="monotone" dataKey="humidity" stroke="#F59E0B" fill="#FFF2D6" fillOpacity={0.35} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full rounded-[18px] border border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 dark:text-gray-500 text-[13px]">
            No comparative data yet.
          </div>
        )}
      </div>
    </div>
  );
}

function PumpActivityCard({ logs }: { logs: IrrigationLogsResponse | null }) {
  const chartData = (logs?.logs || []).slice(0, 8).reverse().map((log: any, index: number) => ({
    label: log.timestamp
      ? new Date(log.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
      : `#${index + 1}`,
    on: String(log.pumpStatus || "").toUpperCase() === "ON" ? 1 : 0,
    moisture: Number(log.soilMoisture || 0),
  }));

  return (
    <div className="rounded-[24px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] transition-colors">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-[15px]">Pump Activity</h3>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">Recent pump state compared with moisture readings</p>
      </div>
      <div className="h-[280px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <Tooltip
                contentStyle={{
                  borderRadius: "14px",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                }}
              />
              <Legend />
              <Bar dataKey="on" name="Pump On" fill="#39B54A" radius={[8, 8, 0, 0]} />
              <Bar dataKey="moisture" name="Moisture" fill="#60A5FA" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full rounded-[18px] border border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 dark:text-gray-500 text-[13px]">
            No pump activity yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState("default");
  const [loading, setLoading] = useState(true);
  const [mlRefreshTrigger, setMlRefreshTrigger] = useState(0);
  const [geoRefreshTrigger, setGeoRefreshTrigger] = useState(0);
  const { latestData, isConnected, alerts: rawAlerts } = useSocket();
  const [latest, setLatest] = useState<SensorData | null>(null);
  const [trendData, setTrendData] = useState<EnrichedReading[]>([]);
  const [irrigationLogs, setIrrigationLogs] = useState<IrrigationLogsResponse | null>(null);
  const [pumpBusy, setPumpBusy] = useState(false);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;

    socket.on("mlRefresh", () => {
      setMlRefreshTrigger(prev => prev + 1);
    });

    socket.on("geoUpdate", () => {
      setGeoRefreshTrigger(prev => prev + 1);
    });

    return () => {
      socket.off("mlRefresh");
      socket.off("geoUpdate");
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      if (saved) {
        const parsed = JSON.parse(saved);
        const name = parsed.fullName || parsed.name;
        if (name) {
          setUserName(name.split(" ")[0]);
        }
      }
    } catch(e) {}
  }, []);

  const alerts = rawAlerts.map((alert) => ({
    title: alert.title,
    desc: alert.message,
    zone: alert.zone,
    time: alert.timestamp
      ? new Date(alert.timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
    type: alert.type === "critical" ? "red" : alert.type === "warning" ? "orange" : "yellow",
  }));

  const activeZoneId = useMemo(
    () =>
      selectedZone !== "default"
        ? selectedZone
        : zones[0]?.zoneId || latest?.zone?.replace(/\s+/g, "") || "",
    [selectedZone, zones, latest]
  );

  const activeZone = useMemo(
    () => zones.find((zone) => zone.zoneId === activeZoneId) || null,
    [zones, activeZoneId]
  );

  const activePumpState = activeZone?.pumpActive ?? false;

  useEffect(() => {
    if (latestData) setLatest(latestData);
  }, [latestData]);

  const fetchData = useCallback(async () => {
    try {
      const [latestRes, zonesRes] = await Promise.all([
        getLatestData().catch(() => []),
        getZones().catch(() => []),
      ]);

      if (!latest && latestRes[0]) setLatest(latestRes[0]);
      setZones(zonesRes);
    } finally {
      setLoading(false);
    }
  }, [latest]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      getZones().then(setZones).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    let mounted = true;

    const loadInsights = async () => {
      if (!activeZoneId) {
        setTrendData([]);
        setIrrigationLogs(null);
        return;
      }

      try {
        const [trendRes, logsRes] = await Promise.all([
          getEnrichedData(activeZoneId, 24).catch(() => ({ enriched: [] })),
          getIrrigationLogs(undefined, activeZoneId, 8).catch(() => null),
        ]);

        if (!mounted) return;
        setTrendData((trendRes.enriched || []).reverse());
        setIrrigationLogs(logsRes);
      } catch {
        if (mounted) {
          setTrendData([]);
          setIrrigationLogs(null);
        }
      }
    };

    loadInsights();

    return () => {
      mounted = false;
    };
  }, [activeZoneId, geoRefreshTrigger]);

  const activePumps = zones.filter((zone) => zone.pumpActive).length;
  const alertCount = alerts.length;
  const avgMoisture = latest?.soilMoisture ?? 0;
  const temperature = latest?.temperature ?? 0;
  const humidity = latest?.humidity ?? 0;
  const pumpStatus = latest?.pumpStatus || "OFF";

  const handlePumpToggle = useCallback(async () => {
    if (!activeZoneId || pumpBusy) return;

    const nextState = !activePumpState;
    setPumpBusy(true);

    setZones((prev) =>
      prev.map((zone) =>
        zone.zoneId === activeZoneId ? { ...zone, pumpActive: nextState } : zone
      )
    );

    try {
      await togglePump(activeZoneId, nextState);
    } catch {
      setZones((prev) =>
        prev.map((zone) =>
          zone.zoneId === activeZoneId ? { ...zone, pumpActive: activePumpState } : zone
        )
      );
    } finally {
      setPumpBusy(false);
    }
  }, [activePumpState, activeZoneId, pumpBusy]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Loading...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[24px] lg:text-[28px] font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Good Morning, {userName}! 👋
            </h1>
            <p className="mt-1 text-gray-500 text-[13px] lg:text-[14px] font-medium">
              Optimize your farm operations with real-time insights and AI recommendations.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 shadow-sm">
            <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-[#39B54A]" : "bg-gray-400"}`} />
            <span className={`text-[12px] font-semibold ${isConnected ? "text-[#39B54A]" : "text-gray-400"}`}>
              {isConnected ? "Last update: live" : "Connecting..."}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <OverviewCard
            title="Total Zones"
            value={zones.length || 0}
            subtitle="All configured irrigation areas"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20" />
                <path d="M2 12h20" />
                <path d="M5 5l14 14" />
              </svg>
            }
          />
          <OverviewCard
            title="Active Pumps"
            value={activePumps}
            subtitle="Pumps currently active"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v7" />
                <path d="M7 9h10" />
                <path d="M6 20h12" />
                <path d="M9 9v11" />
                <path d="M15 9v11" />
              </svg>
            }
          />
          <OverviewCard
            title="Avg Moisture"
            value={`${avgMoisture}%`}
            subtitle="Latest sensor reading"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2s5 6 5 11a5 5 0 0 1-10 0c0-5 5-11 5-11Z" />
              </svg>
            }
          />
          <OverviewCard
            title="Alerts"
            value={alertCount}
            subtitle={alertCount > 0 ? "Needs attention" : "All clear"}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-8 space-y-5">
            <ZoneSelectorCard
              zones={zones}
              selectedZone={selectedZone}
              onZoneSelect={setSelectedZone}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard
                title="Soil Moisture"
                value={`${latest?.soilMoisture ?? 75}%`}
                subtitle="Current reading"
                accent="emerald"
              />
              <MetricCard
                title="Temperature"
                value={`${temperature}°C`}
                subtitle="Current reading"
                accent="blue"
              />
              <MetricCard
                title="Humidity"
                value={`${humidity}%`}
                subtitle="Current reading"
                accent="amber"
              />
              <div className="rounded-[20px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-[0_1px_10px_-5px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_10px_-5px_rgba(0,0,0,0.3)] flex flex-col justify-between transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                      Pump Status
                    </div>
                    <div className="mt-2 text-[30px] font-extrabold text-gray-900 dark:text-gray-100 leading-none">
                      {activePumpState ? "ON" : "OFF"}
                    </div>
                    <div className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">
                      {pumpStatus === "ON"
                        ? "ESP32 is reporting the pump as active"
                        : "Ready to toggle the pump from the dashboard"}
                    </div>
                  </div>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${
                      activePumpState ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                    </svg>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePumpToggle}
                  disabled={!activeZoneId || pumpBusy}
                  className={`mt-4 inline-flex items-center justify-center gap-2 rounded-[14px] px-4 py-3 text-[13px] font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    activePumpState ? "bg-red-500 hover:bg-red-600" : "bg-[#39B54A] hover:bg-[#2ea33e]"
                  }`}
                >
                  {pumpBusy ? "Updating..." : activePumpState ? "Turn Pump Off" : "Turn Pump On"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <TrendChartCard
                data={trendData}
                title="Moisture Trend"
                subtitle={`Recent derived signals for ${activeZone?.name || "the selected zone"}`}
              />
              <RiskDistributionCard data={trendData} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <ConditionsComparisonCard data={trendData} />
              <PumpActivityCard logs={irrigationLogs} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <DataTableCard
                title="Recent Irrigation Logs"
                emptyText="No irrigation logs are available for the selected zone yet."
                items={(irrigationLogs?.logs || []).map((log: any, index: number) => ({
                  label: log.zone || activeZone?.name || "Zone",
                  value: `${log.soilMoisture ?? "--"}%`,
                  meta: `${log.timestamp ? new Date(log.timestamp).toLocaleString() : ""} • Pump ${String(log.pumpStatus || "--")}`,
                  tone: String(log.pumpStatus || "").toUpperCase() === "ON" ? "green" : "gray",
                  id: `log-${index}`,
                }))}
              />

              <DataTableCard
                title="Recent Alerts"
                emptyText="No critical alerts right now."
                items={alerts.map((alert, index) => ({
                  label: alert.title,
                  value: alert.zone,
                  meta: `${alert.desc} • ${alert.time}`,
                  tone: alert.type === "red" ? "red" : alert.type === "orange" ? "amber" : "gray",
                  id: index,
                }))}
              />
            </div>
          </div>

          <div className="xl:col-span-4 space-y-5">
            <MLInsightPanel
              zoneId={activeZoneId}
              currentMoisture={avgMoisture}
              temperature={temperature}
              humidity={humidity}
              pumpStatus={pumpStatus}
              refreshTrigger={mlRefreshTrigger}
            />
            <AgentPanel zone={activeZoneId} compact />
          </div>
        </div>

        <div className="py-2 flex justify-center">
          <div className="w-12 h-1 rounded-full bg-gray-200" />
        </div>
      </div>
    </DashboardLayout>
  );
}
