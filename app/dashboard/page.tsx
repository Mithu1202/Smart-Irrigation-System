"use client";

import DashboardLayout from "../components/layout/DashboardLayout";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { getLatestData, getZones } from "../../lib/api";
import { useSocket, SensorData } from "../../lib/useSocket";
import dynamic from "next/dynamic";

// Dynamically import MapWrapper with SSR disabled
const MapWrapper = dynamic(() => import("../components/zones/MapWrapper"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-xl bg-[#dbeae8] flex items-center justify-center animate-pulse">
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
  zones: Zone[]; 
  selectedZone: string;
  onZoneSelect: (zone: string) => void;
}) {
  const validZones = zones.filter(z => z.coordinates?.lat && z.coordinates?.lng && z.coordinates.lat !== 0);
  
  return (
    <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-50 flex flex-col h-full relative z-10">
      <div className="mb-6 rounded-[14px] overflow-hidden relative w-full h-48 md:h-[220px] bg-[#dbeae8] shadow-inner">
        {validZones.length > 0 ? (
          <MapWrapper 
            zones={validZones}
            selectedZone={selectedZone !== "default" ? selectedZone : undefined}
            onZoneSelect={onZoneSelect}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
            <div className="text-center p-4">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="text-gray-500 text-sm font-medium">No zones configured</p>
              <p className="text-gray-400 text-xs">Add zones with coordinates</p>
            </div>
          </div>
        )}
      </div>
      
      <h3 className="font-extrabold tracking-tight text-gray-900 text-lg mb-4 ml-1">Zone Selector</h3>
      
      <div className="relative mb-5 flex-1">
        <select 
          value={selectedZone}
          onChange={(e) => onZoneSelect(e.target.value)}
          className="w-full appearance-none bg-[#f8fafc] border border-gray-200 text-gray-600 text-[13px] font-bold py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3CC15A] shadow-sm cursor-pointer transition-all hover:border-gray-300"
        >
          <option value="default">Select a Zone</option>
          {zones.map((zone) => (
            <option key={zone.zoneId} value={zone.zoneId}>
              {zone.name} - {zone.status}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6"></path></svg>
        </div>
      </div>
      
      <Link href="/zones" className="w-full bg-[#3CC15A] hover:bg-[#34A853] text-[white] py-3.5 rounded-xl font-bold text-[13px] tracking-wide shadow-md hover:shadow-lg transition-all mt-auto text-center flex items-center justify-center gap-2">
         Measure Moisture & Temp
      </Link>
    </div>
  );
}

interface AlertItem {
  title: string;
  message: string;
  zone: string;
  type: "critical" | "warning" | "info";
  timestamp?: Date;
}

function CriticalAlertsCard({ alerts }: { alerts: AlertItem[] }) {
  // Map alert types to colors
  const getAlertColor = (type: string) => {
    if (type === "critical") return "red";
    if (type === "warning") return "orange";
    return "yellow";
  };

  const displayAlerts = alerts.length > 0 ? alerts : [
    { title: "System Normal", message: "No critical alerts at this time", zone: "All Zones", type: "info" as const, timestamp: new Date() }
  ];

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-red-50 p-2 rounded-lg">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <h3 className="font-bold text-gray-900">Critical Alerts</h3>
        {alerts.length > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{alerts.length}</span>
        )}
      </div>
      
      <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px]">
        {displayAlerts.slice(0, 5).map((alert, i) => {
          const color = getAlertColor(alert.type);
          const timeStr = alert.timestamp 
            ? new Date(alert.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
            : "";
          
          return (
            <div key={i} className="flex flex-col border-b border-gray-50 pb-4 last:border-0 last:pb-0">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${color === 'red' ? 'bg-red-500' : color === 'orange' ? 'bg-orange-500' : 'bg-yellow-400'}`} />
                  <span className="font-bold text-gray-900 text-sm">{alert.title}</span>
                </div>
                <div className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${color === 'red' ? 'bg-red-50 text-red-600' : color === 'orange' ? 'bg-orange-50 text-orange-600' : 'bg-yellow-50 text-yellow-600'}`}>
                  {alert.zone}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-400 font-medium">
                <span>{alert.message}</span>
                <span>{timeStr}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-2 text-center border-t border-gray-50">
        <a href="#viewall" className="text-gray-400 text-xs font-bold underline hover:text-gray-600 transition">View All</a>
      </div>
    </div>
  );
}

function SoilMoistureCard({ value }: { value: number }) {
  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-green-50 p-2 rounded-full">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3CC15A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M12 2v20"/><path d="m4.93 4.93 14.14 14.14"/><path d="m19.07 4.93-14.14 14.14"/></svg>
        </div>
        <h3 className="font-bold text-gray-900 text-sm">Soil Moisture (%)</h3>
      </div>
      <div className="flex-1 flex items-center justify-center relative">
        {/* Simple SVG Circular Progress */}
        <svg viewBox="0 0 36 36" className="w-32 h-32 transform -rotate-90">
          <path className="text-gray-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path className="text-[#3CC15A]" strokeDasharray="75, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <div className="absolute flex items-center justify-center inset-0">
          <span className="text-3xl font-bold text-gray-900">{value}%</span>
        </div>
      </div>
    </div>
  );
}

function TemperatureCard({ temp }: { temp: number }) {
  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-red-50 p-2 rounded-full">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
        </div>
        <h3 className="font-bold text-gray-900 text-sm">Temperature (°C)</h3>
      </div>
      <div className="flex-1 flex justify-around items-end pb-2">
        {/* Thermometer 1 */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-400 font-bold mb-1">Soil Temp</span>
          <span className="text-sm font-bold text-gray-900 mb-4">{temp} °C</span>
          <div className="w-10 h-24 bg-gray-100 rounded-full relative flex justify-center py-2">
            <div className="absolute bottom-2 w-1.5 h-10 bg-red-600 rounded-full"></div>
            {/* Marks */}
            <div className="w-full flex flex-col justify-between items-center h-full px-2">
              <div className="w-3 border-t-2 border-gray-300"></div>
              <div className="w-3 border-t-2 border-gray-300"></div>
              <div className="w-3 border-t-2 border-gray-300"></div>
              <div className="w-3 border-t-2 border-gray-300"></div>
              <div className="w-3 border-t-2 border-gray-300"></div>
            </div>
          </div>
        </div>
        {/* Thermometer 2 */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-400 font-bold mb-1">Soil Temp</span>
          <span className="text-sm font-bold text-gray-900 mb-4">5.87 °C</span>
          <div className="w-10 h-24 bg-gray-100 rounded-full relative flex justify-center py-2">
            <div className="absolute bottom-2 w-1.5 h-16 bg-red-600 rounded-full"></div>
            {/* Marks */}
            <div className="w-full flex flex-col justify-between items-center h-full px-2">
              <div className="w-3 border-t-2 border-gray-300"></div>
              <div className="w-3 border-t-2 border-gray-300"></div>
              <div className="w-3 border-t-2 border-gray-300"></div>
              <div className="w-3 border-t-2 border-gray-300"></div>
              <div className="w-3 border-t-2 border-gray-300"></div>
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
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-blue-50 p-2 rounded-full">
          {/* icon */}
        </div>
        <h3 className="font-bold text-gray-900 text-sm">Pump Status</h3>
      </div>

      <div className="flex-1 flex justify-center items-center gap-3">
        <span className="text-sm text-gray-400 font-bold">Off</span>

        <div className={`w-14 h-8 rounded-full relative p-1 cursor-pointer shadow-inner transition-all ${
            isOn ? "bg-[#3CC15A]" : "bg-gray-300"
          }`}
        >
          <div className={`w-6 h-6 bg-white rounded-full absolute shadow-sm transition-all ${
              isOn ? "right-1" : "left-1"
            }`}>
          </div>
        </div>
        <span className="text-sm text-gray-900 font-bold">On</span>
      </div>

      <div className="mt-auto w-full">
        <div className="bg-[#3CC15A] text-white text-center py-2.5 rounded-xl text-sm font-bold shadow-sm">
          Estimated Savings: <span className="text-white">15%</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState("default");
  const [loading, setLoading] = useState(true);
  
  // Use Socket.IO for real-time data and alerts
  const { latestData, lastUpdate, isConnected, alerts } = useSocket();
  const [latest, setLatest] = useState<SensorData | null>(null);

  // Update latest when socket data arrives
  useEffect(() => {
    if (latestData) {
      setLatest(latestData);
    }
  }, [latestData]);

  const fetchData = useCallback(async () => {
    try {
      const [latestRes, zonesRes] = await Promise.all([
        getLatestData().catch(() => []),
        getZones().catch(() => []),
      ]);
      
      // Only set latest from API if no socket data yet
      if (!latest && latestRes[0]) {
        setLatest(latestRes[0]);
      }
      setZones(zonesRes);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [latest]);

  useEffect(() => {
    fetchData();
    
    // Poll zones every 30 seconds (sensor data comes via socket)
    const interval = setInterval(() => {
      getZones().then(setZones).catch(console.error);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return "Connecting...";
    const diff = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    if (diff < 5) return "Just now";
    if (diff < 60) return `${diff} sec ago`;
    return `${Math.floor(diff / 60)} min ago`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading real-time data...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Good Morning!</h1>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-[#3CC15A] animate-pulse" : "bg-gray-400"}`}></div>
            <span className={`text-xs font-bold ${isConnected ? "text-[#3CC15A]" : "text-gray-400"}`}>
              {isConnected ? `Live • ${getTimeSinceUpdate()}` : "Connecting..."}
            </span>
          </div>
        </div>
        <p className="text-gray-500 text-sm font-medium mt-1">Optimize your farm operations with Real-time insights</p>
      </div>

      {/* Main Grid Options */}
      <div className="flex flex-col gap-6">
        {/* Top Row: 2 Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <ZoneSelectorCard 
              zones={zones} 
              selectedZone={selectedZone}
              onZoneSelect={setSelectedZone}
            />
          </div>
          <div className="lg:col-span-5">
            <CriticalAlertsCard alerts={alerts} />
          </div>
        </div>

        {/* Bottom Row: 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SoilMoistureCard value={latest?.soilMoisture || 0} />
          <TemperatureCard temp={latest?.temperature || 0} />
          <PumpStatusCard status={latest?.pumpStatus || "OFF"} />
        </div>
      </div>
      <div className="h-8"></div> {/* Bottom padding compensation */}
    </DashboardLayout>
  );
}