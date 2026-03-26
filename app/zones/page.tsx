"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { getZones, togglePump, getZoneHistory, ChartDataPoint } from "../../lib/api";
import { useSocket } from "../../lib/useSocket";

interface Zone {
  _id?: string;
  zoneId: string;
  name: string;
  status: string;
  coordinates: { lat: number; lng: number };
  soilMoisture: number;
  temperature: number;
  humidity?: number;
  pumpActive: boolean;
  crop: string;
  area: string;
  moistureThreshold: number;
  autoMode?: boolean;
  lastUpdate?: string;
}

function CircularIndicator({ percentage, colorClass, highlightClass }: { percentage: number, colorClass: string, highlightClass: string }) {
  return (
    <div className="relative w-8 h-8 flex items-center justify-center">
      <svg viewBox="0 0 36 36" className={`w-8 h-8 transform -rotate-90 ${colorClass}`}>
        <path className="text-gray-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <path className={highlightClass} strokeDasharray={`${percentage}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      </svg>
    </div>
  );
}

function ZoneCardDetailed({ zone, onOpenModal, onTogglePump }: { 
  zone: Zone; 
  onOpenModal: (z: Zone) => void;
  onTogglePump: (zoneId: string) => void;
}) {
  let badgeClass = "bg-[#EEFBF2] text-[#3CC15A]";
  if (zone.status === "Dry") badgeClass = "bg-red-50 text-red-500";
  if (zone.status === "Wet") badgeClass = "bg-blue-50 text-blue-500";

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-gray-900 text-lg">{zone.name}</h3>
          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${badgeClass}`}>
            {zone.status}
          </span>
        </div>
        <button className="text-gray-400 hover:text-gray-600 transition" onClick={() => onOpenModal(zone)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>

      {/* Metrics List */}
      <div className="flex-1 space-y-5 mb-8">
        {/* Soil Moisture */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-50 p-2 rounded-full">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3CC15A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M12 2v20"/><path d="m4.93 4.93 14.14 14.14"/><path d="m19.07 4.93-14.14 14.14"/></svg>
            </div>
            <span className="text-sm font-bold text-gray-600">Soil Moisture</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-900">{zone.soilMoisture}%</span>
            <CircularIndicator percentage={zone.soilMoisture} colorClass="text-gray-100" highlightClass="text-[#3CC15A]" />
          </div>
        </div>

        {/* Soil Temp */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2 rounded-full">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
            </div>
            <span className="text-sm font-bold text-gray-600">Soil Temp</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-900">{zone.temperature}°C</span>
            <CircularIndicator percentage={zone.temperature} colorClass="text-gray-100" highlightClass="text-red-500" />
          </div>
        </div>

        {/* Pump Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-full">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
            </div>
            <span className="text-sm font-bold text-gray-600">Pump Status</span>
          </div>
          <div className="flex items-center justify-end w-[68px]">
             <button 
               onClick={() => onTogglePump(zone.zoneId)}
               className={`w-12 h-6 rounded-full relative p-1 cursor-pointer shadow-inner transition-colors ${
                 zone.pumpActive ? "bg-[#3CC15A]" : "bg-gray-200"
               }`}
             >
               <div className={`w-4 h-4 bg-white rounded-full absolute shadow-sm transition-all top-1.5 ${
                 zone.pumpActive ? "right-1" : "left-1"
               }`}></div>
             </button>
          </div>
        </div>
      </div>

      {/* View Details Button */}
      <button onClick={() => onOpenModal(zone)} className="w-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 py-3 rounded-xl text-xs font-bold transition-colors">
        View all details
      </button>
    </div>
  );
}

function ZoneDetailsModal({ zone, onClose, onTogglePump }: { zone: Zone; onClose: () => void; onTogglePump: (zoneId: string) => void }) {
  const [historyData, setHistoryData] = useState<ChartDataPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getZoneHistory(zone.zoneId, 20);
        setHistoryData(data);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [zone.zoneId]);

  let badgeClass = "bg-[#EEFBF2] text-[#3CC15A]";
  if (zone.status === "Dry") badgeClass = "bg-red-50 text-red-500";
  if (zone.status === "Wet") badgeClass = "bg-blue-50 text-blue-500";

  // Calculate averages from history
  const avgMoisture = historyData.length > 0 
    ? Math.round(historyData.reduce((sum, d) => sum + d.moisture, 0) / historyData.length) 
    : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col hide-scrollbar relative z-[101]">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur z-[102] p-6 pb-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{zone.name}</h2>
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${badgeClass}`}>{zone.status}</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="p-6 pt-4 space-y-6">
          {/* Live Data Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 font-medium mb-1">Soil Moisture</p>
              <p className="text-2xl font-bold text-[#3CC15A]">{zone.soilMoisture}%</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 font-medium mb-1">Temperature</p>
              <p className="text-2xl font-bold text-red-500">{zone.temperature}°C</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 font-medium mb-1">Pump Status</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className={`text-xs font-bold ${zone.pumpActive ? "text-gray-400" : "text-gray-700"}`}>Off</span>
                <button 
                  onClick={() => onTogglePump(zone.zoneId)}
                  className={`w-11 h-7 rounded-full relative p-2 cursor-pointer shadow-inner transition-colors ${
                    zone.pumpActive ? "bg-[#3CC15A]" : "bg-gray-300"
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute shadow-sm transition-all top-1.5 ${
                    zone.pumpActive ? "right-2" : "left-1"
                  }`}></div>
                </button>
                <span className={`text-xs font-bold ${zone.pumpActive ? "text-gray-700" : "text-gray-400"}`}>On</span>
              </div>
            </div>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1 font-medium">Zone ID: <span className="font-bold text-gray-900">ZN-{zone.zoneId}</span></p>
              <p className="text-gray-500 font-medium">Crop Type: <span className="font-bold text-gray-900">{zone.crop}</span></p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 font-medium">Area Size: <span className="font-bold text-gray-900">{zone.area}</span></p>
              <p className="text-gray-500 font-medium">Moisture Threshold: <span className="font-bold text-gray-900">{zone.moistureThreshold}%</span></p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Moisture Chart */}
            <div className="border border-gray-100 rounded-xl p-3 h-48 bg-gray-50/50">
              <p className="text-xs font-bold text-gray-600 mb-2">Soil Moisture History</p>
              {loadingHistory ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading...</div>
              ) : historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={historyData}>
                    <defs>
                      <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3CC15A" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3CC15A" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="moisture" stroke="#3CC15A" strokeWidth={2} fillOpacity={1} fill="url(#colorMoisture)" name="Moisture %" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data available</div>
              )}
            </div>
            {/* Temperature & Humidity Chart */}
            <div className="border border-gray-100 rounded-xl p-3 h-48 bg-gray-50/50">
              <p className="text-xs font-bold text-gray-600 mb-2">Temperature & Humidity</p>
              {loadingHistory ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading...</div>
              ) : historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="temperature" stroke="#EF4444" strokeWidth={2} dot={false} name="Temp °C" />
                    <Line type="monotone" dataKey="humidity" stroke="#3B82F6" strokeWidth={2} dot={false} name="Humidity %" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data available</div>
              )}
            </div>
          </div>

          {/* Aggregates */}
          <div className="flex justify-between items-center text-sm font-bold text-gray-900 py-2">
            <span>AVG Moisture: {avgMoisture}%</span>
            <span>Data Points: {historyData.length}</span>
          </div>

          {/* Table */}
          <div>
            <h4 className="font-bold text-gray-900 text-sm mb-3">Recent Readings</h4>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200">
                  <tr className="text-gray-500 font-bold bg-white">
                    <th className="px-4 py-3 font-bold">Time</th>
                    <th className="px-4 py-3 font-bold">Moisture</th>
                    <th className="px-4 py-3 font-bold">Temp</th>
                    <th className="px-4 py-3 font-bold text-right">Humidity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {historyData.slice(-5).reverse().map((d, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-gray-900 font-medium">{d.time}</td>
                      <td className="px-4 py-3 text-gray-500 font-medium">{d.moisture}%</td>
                      <td className="px-4 py-3 text-gray-500 font-medium">{d.temperature}°C</td>
                      <td className="px-4 py-3 text-gray-500 font-medium text-right">{d.humidity}%</td>
                    </tr>
                  ))}
                  {historyData.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-gray-400 text-center">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Footer Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-2 mb-2 bg-gray-50/50 p-2 rounded-xl">
             <div className="relative border border-gray-200 rounded-lg bg-white overflow-hidden text-xs font-bold text-gray-700 min-w-[140px]">
               <select className="w-full appearance-none py-2 px-3 focus:outline-none focus:ring-1 focus:ring-green-500 bg-transparent relative z-10 cursor-pointer">
                 <option>Edit Threshold</option>
                 <option>10%</option>
                 <option>20%</option>
               </select>
               <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
               </div>
             </div>

             <div className="flex items-center gap-2 border border-gray-200 rounded-lg bg-white p-1 text-xs font-bold text-gray-700">
               <span className="px-2">Set Duration</span>
               <div className="bg-gray-100 px-3 py-1.5 rounded-md">10 min</div>
             </div>

             <div className="flex items-center gap-3 border border-gray-200 rounded-lg bg-white py-1.5 px-3">
                <span className="text-xs font-bold text-gray-700">Auto Mode</span>
                <div className="w-9 h-5 bg-[#3CC15A] rounded-full relative p-0.5 cursor-pointer shadow-inner">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 shadow-sm transform transition-transform"></div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [filter, setFilter] = useState<"All" | "Wet" | "Dry">("All");
  const [loading, setLoading] = useState(true);
  
  // Use Socket.IO for real-time updates
  const { latestData, isConnected, dataHistory, alerts, pumpStatus, dismissAlert } = useSocket();

  const fetchZones = useCallback(async () => {
    try {
      const zonesData = await getZones();
      setZones(zonesData);
    } catch (error) {
      console.error("Failed to fetch zones:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
    
    // Poll for zone updates every 30 seconds
    const interval = setInterval(fetchZones, 30000);
    return () => clearInterval(interval);
  }, [fetchZones]);

  // Update zones when real-time data arrives (exclude pump status - that comes from pumpStatus event)
  useEffect(() => {
    if (latestData) {
      setZones(prevZones => 
        prevZones.map(zone => {
          // Match Zone A with ESP32_001 data (can extend for more devices)
          const isMatchingZone = zone.zoneId === "A" && 
            (latestData.device_id === "ESP32_001" || latestData.zone === "Zone A");
          
          if (isMatchingZone) {
            return { 
              ...zone, 
              soilMoisture: latestData.soilMoisture,
              temperature: latestData.temperature,
              humidity: latestData.humidity,
              // Don't update pumpActive from sensor data - use pumpStatus socket event instead
            };
          }
          return zone;
        })
      );
      
      // Also update selectedZone if it's Zone A
      if (selectedZone?.zoneId === "A") {
        setSelectedZone(prev => prev ? {
          ...prev,
          soilMoisture: latestData.soilMoisture,
          temperature: latestData.temperature,
          humidity: latestData.humidity,
          // Don't update pumpActive here either
        } : null);
      }
    }
  }, [latestData, selectedZone?.zoneId]);

  // Update pump status when received from socket (this is the authoritative source)
  useEffect(() => {
    if (pumpStatus) {
      setZones(prevZones => 
        prevZones.map(zone => 
          zone.zoneId === pumpStatus.zoneId 
            ? { ...zone, pumpActive: pumpStatus.pumpActive }
            : zone
        )
      );
      
      // Also update selectedZone pump status
      if (selectedZone?.zoneId === pumpStatus.zoneId) {
        setSelectedZone(prev => prev ? {
          ...prev,
          pumpActive: pumpStatus.pumpActive
        } : null);
      }
    }
  }, [pumpStatus, selectedZone?.zoneId]);

  const handleTogglePump = async (zoneId: string) => {
    // Optimistic update - toggle immediately in UI
    setZones(prevZones => 
      prevZones.map(zone => 
        zone.zoneId === zoneId 
          ? { ...zone, pumpActive: !zone.pumpActive }
          : zone
      )
    );
    
    try {
      await togglePump(zoneId);
    } catch (error) {
      console.error("Failed to toggle pump:", error);
      // Revert on error
      setZones(prevZones => 
        prevZones.map(zone => 
          zone.zoneId === zoneId 
            ? { ...zone, pumpActive: !zone.pumpActive }
            : zone
        )
      );
    }
  };

  const filteredZones = zones.filter((zone) => {
    if (filter === "All") return true;
    return zone.status === filter;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading zones...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-[22px] font-bold text-gray-900">Zone Overview</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-[#3CC15A] animate-pulse" : "bg-gray-400"}`}></div>
              <span className={`text-xs font-bold ${isConnected ? "text-[#3CC15A]" : "text-gray-400"}`}>
                {isConnected ? "Live" : "Offline"}
              </span>
            </div>
          </div>
          <p className="text-gray-500 text-[13px] font-medium">Live soil and pump status for every zone</p>
        </div>

        <div className="flex items-center gap-6">
          {/* Filters */}
          <div className="flex items-center text-[13px] font-bold">
            <button 
              onClick={() => setFilter("All")}
              className={`pb-1 px-1 transition ${filter === "All" ? "text-[#3CC15A] border-b-2 border-[#3CC15A]" : "text-gray-500 hover:text-gray-800"}`}
            >
              All
            </button>
            <span className="text-gray-300 mx-2">|</span>
            <button 
              onClick={() => setFilter("Wet")}
              className={`pb-1 px-1 transition ${filter === "Wet" ? "text-[#3CC15A] border-b-2 border-[#3CC15A]" : "text-gray-500 hover:text-gray-800"}`}
            >
              Wet
            </button>
            <span className="text-gray-300 mx-2">|</span>
            <button 
              onClick={() => setFilter("Dry")}
              className={`pb-1 px-1 transition ${filter === "Dry" ? "text-[#3CC15A] border-b-2 border-[#3CC15A]" : "text-gray-500 hover:text-gray-800"}`}
            >
              Dry Zones
            </button>
          </div>

          {/* Add New Zone Button */}
          <button className="bg-[#3CC15A] hover:bg-[#34A853] text-white px-5 py-2.5 rounded-[10px] text-[13px] font-bold shadow-sm transition-colors">
            Add New Zone +
          </button>
        </div>
      </div>

      {/* Grid of Zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredZones.map((zone) => (
          <ZoneCardDetailed 
            key={zone.zoneId} 
            zone={zone} 
            onOpenModal={setSelectedZone}
            onTogglePump={handleTogglePump}
          />
        ))}
      </div>

      {/* Real-time Charts Section */}
      {dataHistory.length > 0 && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real-time Moisture Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Real-time Soil Moisture</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#3CC15A] animate-pulse"></div>
                <span className="text-xs font-medium text-[#3CC15A]">Live</span>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataHistory}>
                  <defs>
                    <linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3CC15A" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3CC15A" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="moisture" 
                    stroke="#3CC15A" 
                    strokeWidth={2}
                    fill="url(#moistureGradient)" 
                    name="Moisture %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Real-time Temperature Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Temperature & Humidity</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-xs font-medium text-gray-600">Temp</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-xs font-medium text-gray-600">Humidity</span>
                </div>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    dot={false}
                    name="Temperature °C"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="humidity" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={false}
                    name="Humidity %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Critical Alerts Panel */}
      {alerts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[90] max-w-sm space-y-2">
          {alerts.slice(0, 3).map((alert, index) => (
            <div 
              key={index}
              className={`p-4 rounded-xl shadow-lg border backdrop-blur-sm animate-in slide-in-from-right duration-300 ${
                alert.type === "critical" 
                  ? "bg-red-50/95 border-red-200" 
                  : "bg-yellow-50/95 border-yellow-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    alert.type === "critical" ? "bg-red-100" : "bg-yellow-100"
                  }`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" 
                      stroke={alert.type === "critical" ? "#EF4444" : "#F59E0B"} 
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                      <path d="M12 9v4"/><path d="M12 17h.01"/>
                    </svg>
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${
                      alert.type === "critical" ? "text-red-800" : "text-yellow-800"
                    }`}>{alert.title}</p>
                    <p className={`text-xs mt-0.5 ${
                      alert.type === "critical" ? "text-red-600" : "text-yellow-600"
                    }`}>{alert.message}</p>
                  </div>
                </div>
                <button 
                  onClick={() => dismissAlert(index)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="h-8"></div>
      
      {/* Modal Overlay Component */}
      {selectedZone && (
        <ZoneDetailsModal 
          zone={selectedZone} 
          onClose={() => setSelectedZone(null)} 
          onTogglePump={handleTogglePump}
        />
      )}
    </DashboardLayout>
  );
}
