"use client";

import DashboardLayout from "../components/layout/DashboardLayout";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { getLatestData, getZones } from "../../lib/api";
import { useSocket, SensorData } from "../../lib/useSocket";
import dynamic from "next/dynamic";

const MapWrapper = dynamic(() => import("../components/zones/MapWrapper"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-[14px] bg-[#E8F2EC] flex items-center justify-center animate-pulse">
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
  pumpActive?: boolean;
  crop?: string;
}

function ZoneSelectorCard({ zones, selectedZone, onZoneSelect }: { 
  zones: Zone[]; selectedZone: string; onZoneSelect: (zone: string) => void;
}) {
  const validZones = zones.filter(z => z.coordinates?.lat && z.coordinates?.lng && z.coordinates.lat !== 0);
  return (
    <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50 flex flex-col relative z-10">
      <div className="mb-4 rounded-[14px] overflow-hidden relative w-full h-44 bg-[#E8F2EC]">
        {validZones.length > 0 ? (
          <MapWrapper zones={validZones} selectedZone={selectedZone !== "default" ? selectedZone : undefined} onZoneSelect={onZoneSelect} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-4">
              <div className="text-2xl mb-1">🗺️</div>
              <p className="text-gray-500 text-xs font-medium">No zones configured</p>
            </div>
          </div>
        )}
      </div>
      <h3 className="font-bold tracking-tight text-gray-900 text-[15px] mb-3 ml-1">Zone Selecter</h3>
      <div className="relative mb-4 flex-1">
        <select 
          value={selectedZone}
          onChange={(e) => onZoneSelect(e.target.value)}
          className="w-full appearance-none bg-white border border-gray-200 text-gray-500 text-[13px] font-semibold py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3CC15A] shadow-sm cursor-pointer"
        >
          <option value="default">select a Zone</option>
          {zones.map((zone) => (
            <option key={zone.zoneId} value={zone.zoneId}>{zone.name}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6"></path></svg>
        </div>
      </div>
      <Link href="/zones" className="w-full bg-[#3CC15A] text-white py-3.5 rounded-[12px] font-bold text-[14px] shadow-sm transition-all text-center">
         Measure Moisture & Temp
      </Link>
    </div>
  );
}

function SoilMoistureCard({ value }: { value: number }) {
  return (
    <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-[#EEFBF2] w-8 h-8 rounded-full flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3CC15A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M12 2v20"/><path d="m4.93 4.93 14.14 14.14"/><path d="m19.07 4.93-14.14 14.14"/></svg>
        </div>
        <h3 className="font-extrabold text-gray-900 text-[15px]">Soil Moisture (%)</h3>
      </div>
      <div className="flex-1 flex items-center justify-center relative min-h-[140px] mb-2">
        <svg viewBox="0 0 36 36" className="w-[140px] h-[140px] transform -rotate-90">
          <path className="text-gray-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path className="text-[#3CC15A]" strokeDasharray="75, 100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <div className="absolute flex items-center justify-center inset-0">
          <span className="text-[32px] font-extrabold text-gray-900 tracking-tight">{value}%</span>
        </div>
      </div>
    </div>
  );
}

function TemperatureCard({ temp }: { temp: number }) {
  return (
    <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-red-50 w-8 h-8 rounded-full flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
        </div>
        <h3 className="font-extrabold text-gray-900 text-[15px]">Temperature (°C)</h3>
      </div>
      <div className="flex justify-around items-end px-2">
        <div className="flex flex-col items-center">
          <span className="text-[12px] text-gray-500 font-bold mb-1">Soil Temp</span>
          <span className="text-[15px] font-bold text-gray-900 mb-4 tracking-tight">3.55 °C</span>
          <div className="w-10 h-[100px] bg-gray-100 rounded-full relative flex justify-center py-2 shadow-inner border border-gray-200/50">
            <div className="absolute bottom-2 w-1.5 h-10 bg-red-500 rounded-full"></div>
            <div className="w-full flex flex-col justify-between items-center h-full px-[18%] z-10">
              {[...Array(6)].map((_, i) => <div key={i} className="w-full border-t border-gray-300"></div>)}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[12px] text-gray-500 font-bold mb-1">Soil Temp</span>
          <span className="text-[15px] font-bold text-gray-900 mb-4 tracking-tight">5.87 °C</span>
          <div className="w-10 h-[100px] bg-gray-100 rounded-full relative flex justify-center py-2 shadow-inner border border-gray-200/50">
            <div className="absolute bottom-2 w-1.5 h-[60px] bg-red-500 rounded-full"></div>
            <div className="w-full flex flex-col justify-between items-center h-full px-[18%] z-10">
              {[...Array(6)].map((_, i) => <div key={i} className="w-full border-t border-gray-300"></div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PumpStatusCard({ status }: { status: string }) {
  const isOn = status === "ON";
  return (
    <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50 flex flex-col">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-blue-50 w-8 h-8 rounded-full flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
        </div>
        <h3 className="font-extrabold text-gray-900 text-[15px]">Pump Status</h3>
      </div>
      <div className="flex justify-center items-center gap-4 mb-6 mt-2">
        <span className={`text-[15px] font-bold ${!isOn ? "text-gray-900" : "text-gray-400"}`}>Off</span>
        <div className={`w-[60px] h-[34px] rounded-full relative p-1 transition-all ${isOn ? "bg-[#3CC15A]" : "bg-gray-200"}`}>
          <div className={`w-[26px] h-[26px] bg-white rounded-full absolute shadow-sm transition-all ${isOn ? "right-1" : "left-1"}`}></div>
        </div>
        <span className={`text-[15px] font-bold ${isOn ? "text-gray-900" : "text-gray-400"}`}>On</span>
      </div>
      <div className="w-full bg-[#3CC15A] text-white text-center py-3.5 rounded-xl text-[14px] font-bold shadow-sm">
        Estimated Savings: 15%
      </div>
    </div>
  );
}

function CriticalAlertsCard({ alerts }: { alerts: { title: string; desc: string; zone: string; time: string; type: string }[] }) {
  const getAlertColor = (type: string) => {
    switch (type) {
      case "red": return { dot: "bg-red-500", badge: "bg-red-50 text-red-500" };
      case "orange": return { dot: "bg-orange-500", badge: "bg-orange-50 text-orange-500" };
      case "yellow": return { dot: "bg-yellow-500", badge: "bg-yellow-50 text-yellow-600" };
      default: return { dot: "bg-gray-500", badge: "bg-gray-50 text-gray-500" };
    }
  };

  return (
    <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-red-50 w-8 h-8 rounded-full flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17.5" r="1.5" fill="#EF4444" stroke="none"/></svg>
        </div>
        <h3 className="font-extrabold text-gray-900 text-[15px]">Critical Alerts</h3>
        {alerts.length > 0 && (
          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {alerts.length}
          </span>
        )}
      </div>
      
      <div className="space-y-4 flex-1 overflow-y-auto max-h-[280px]">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <p className="text-gray-500 text-[13px] font-medium">All systems normal</p>
            <p className="text-gray-400 text-[11px]">No critical alerts</p>
          </div>
        ) : (
          alerts.slice(0, 5).map((alert, index) => {
            const colors = getAlertColor(alert.type);
            return (
              <div key={index} className="flex flex-col border-b border-gray-100 pb-4 last:border-b-0">
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                    <span className="font-bold text-gray-900 text-[13px]">{alert.title}</span>
                  </div>
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${colors.badge}`}>
                    {alert.zone} <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-400 font-medium tracking-tight">
                  <span>{alert.desc}</span>
                  <span className="self-end whitespace-nowrap ml-2">{alert.time}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {alerts.length > 0 && (
        <div className="mt-4 text-center pt-2 border-t border-gray-100">
          <Link href="/alerts" className="text-gray-400 text-[12px] font-bold underline underline-offset-2 hover:text-gray-600 transition">
            View All ({alerts.length})
          </Link>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState("default");
  const [loading, setLoading] = useState(true);
  const { latestData, isConnected, alerts: rawAlerts } = useSocket();
  const [latest, setLatest] = useState<SensorData | null>(null);

  // Transform alerts from backend format to UI format
  const alerts = rawAlerts.map(alert => ({
    title: alert.title,
    desc: alert.message,
    zone: alert.zone,
    time: alert.timestamp 
      ? new Date(alert.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
      : new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    type: alert.type === "critical" ? "red" : alert.type === "warning" ? "orange" : "yellow",
  }));

  useEffect(() => {
    if (latestData) setLatest(latestData);
  }, [latestData]);

  const fetchData = useCallback(async () => {
    try {
      const [latestRes, zonesRes] = await Promise.all([
        getLatestData().catch(() => []), getZones().catch(() => []),
      ]);
      if (!latest && latestRes[0]) setLatest(latestRes[0]);
      setZones(zonesRes);
    } catch {} finally { setLoading(false); }
  }, [latest]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => { getZones().then(setZones).catch(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return <DashboardLayout><div className="h-64 flex items-center justify-center text-gray-500">Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
           <h1 className="text-[20px] font-extrabold text-gray-900 tracking-tight">Good Morning Mithu!</h1>
           <div className="flex items-center gap-1.5">
             <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-[#3CC15A]" : "bg-gray-400"}`}></div>
             <span className={`text-[10px] font-bold ${isConnected ? "text-[#3CC15A]" : "text-gray-400"}`}>
               {isConnected ? "Last Update 10 min ago" : "Connecting..."}
             </span>
           </div>
        </div>
        <p className="text-gray-500 text-[13px] font-medium leading-tight pr-6 tracking-tight">
          Optimize your farm operations with Real-time<br/>Insights.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:gap-6">
        {/* Top Row: Zone Selector & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full">
            <div className="flex-1 h-full min-h-[400px]">
              <ZoneSelectorCard zones={zones} selectedZone={selectedZone} onZoneSelect={setSelectedZone} />
            </div>
          </div>
          <div className="lg:col-span-4 xl:col-span-3 hidden lg:flex flex-col h-full">
            <div className="flex-1 h-full w-full">
              <CriticalAlertsCard alerts={alerts} />
            </div>
          </div>
        </div>

        {/* Bottom Row: 3 Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <SoilMoistureCard value={latest?.soilMoisture || 75} />
          <TemperatureCard temp={latest?.temperature || 0} />
          <PumpStatusCard status={latest?.pumpStatus || "OFF"} />
        </div>
        
        {/* Mobile-only Alerts (Moves below metrics on smaller screens) */}
        <div className="lg:hidden block">
          <CriticalAlertsCard alerts={alerts} />
        </div>
      </div>
      
      <div className="py-4 flex justify-center">
        <div className="w-12 h-1 bg-gray-200 rounded-full"></div>
      </div>
    </DashboardLayout>
  );
}
