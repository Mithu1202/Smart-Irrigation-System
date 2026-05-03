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

function ZoneCardDetailed({ zone, onOpenModal, onTogglePump }: { 
  zone: Zone; 
  onOpenModal: (z: Zone) => void;
  onTogglePump: (zoneId: string) => void;
}) {
  let badgeClass = "bg-[#EEFBF2] text-[#3CC15A]";
  if (zone.status === "Dry" || zone.status === "Critical") badgeClass = "bg-red-50 text-red-500";
  if (zone.status === "Warning") badgeClass = "bg-orange-50 text-orange-500";
  if (zone.status === "Wet" || zone.status === "Good") badgeClass = "bg-[#EEFBF2] text-[#3CC15A]";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50 dark:border-slate-700 flex flex-col mb-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2.5">
          <h3 className="font-extrabold text-gray-900 dark:text-gray-100 text-[17px] tracking-tight">{zone.name}</h3>
          <span className="px-2.5 py-1 rounded-[8px] text-[11px] font-extrabold bg-[#EEFBF2] dark:bg-green-900/30 text-[#3CC15A] dark:text-green-400 tracking-tight">
            {zone.crop}
          </span>
        </div>
        <span className={`px-2.5 py-1 rounded-[8px] text-[11px] font-extrabold tracking-tight ${badgeClass.replace('bg-red-50', 'bg-red-50 dark:bg-red-900/30').replace('bg-[#EEFBF2]', 'bg-[#EEFBF2] dark:bg-green-900/30').replace('bg-orange-50', 'bg-orange-50 dark:bg-orange-900/30').replace('text-red-500', 'text-red-500 dark:text-red-400').replace('text-orange-500', 'text-orange-500 dark:text-orange-400')}`}>
          {zone.status}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="flex justify-between items-end mb-5 px-1">
        <div className="flex flex-col gap-1.5">
           <span className="flex items-center gap-1.5 text-[12px] text-gray-400 font-bold tracking-tight">
             <div className="bg-[#EEFBF2] dark:bg-[#EEFBF2]/10 p-1.5 rounded-full">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3CC15A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M12 2v20"/><path d="m4.93 4.93 14.14 14.14"/><path d="m19.07 4.93-14.14 14.14"/></svg>
             </div>
             Moisture
           </span>
           <span className="text-[17px] font-extrabold text-gray-900 dark:text-gray-100 ml-1 leading-none tracking-tight">{zone.soilMoisture}%</span>
        </div>
        
        <div className="w-px h-10 bg-gray-100 dark:bg-slate-700 mb-1"></div>
        
        <div className="flex flex-col gap-1.5">
           <span className="flex items-center gap-1.5 text-[12px] text-gray-400 font-bold tracking-tight">
             <div className="bg-red-50 dark:bg-red-50/10 p-1.5 rounded-full">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
             </div>
             Temp
           </span>
           <span className="text-[17px] font-extrabold text-gray-900 dark:text-gray-100 ml-1 leading-none tracking-tight">{zone.temperature}°C</span>
        </div>

        <div className="w-px h-10 bg-gray-100 dark:bg-slate-700 mb-1"></div>
        
        <div className="flex flex-col gap-1.5">
           <span className="flex items-center gap-1.5 text-[12px] text-gray-400 font-bold tracking-tight">
             <div className="bg-gray-100 dark:bg-gray-100/10 p-1.5 rounded-full text-gray-500">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
             </div>
             Pump
           </span>
           <div className="ml-1 mt-0.5">
             <button 
               onClick={() => onTogglePump(zone.zoneId)}
               className={`w-10 h-[22px] rounded-full relative p-0.5 cursor-pointer shadow-inner transition-colors ${
                 zone.pumpActive ? "bg-[#3CC15A]" : "bg-gray-300"
               }`}
             >
               <div className={`w-4 h-4 bg-white rounded-full absolute shadow-sm transition-all top-[3px] ${
                 zone.pumpActive ? "right-1" : "left-1"
               }`}></div>
             </button>
           </div>
        </div>
      </div>

      {/* View Details Button */}
      <button onClick={() => onOpenModal(zone)} className="w-full bg-[#f8fafc] dark:bg-slate-700/50 text-[#3CC15A] dark:text-[#52d26f] py-3.5 rounded-[14px] text-[13px] font-extrabold tracking-tight transition-colors hover:bg-green-50 dark:hover:bg-slate-700">
        View Details
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
  if (zone.status === "Dry" || zone.status === "Critical") badgeClass = "bg-red-50 text-red-500";
  if (zone.status === "Warning") badgeClass = "bg-orange-50 text-orange-500";
  if (zone.status === "Wet" || zone.status === "Good") badgeClass = "bg-[#EEFBF2] text-[#3CC15A]";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end md:justify-center bg-black/40 backdrop-blur-sm md:p-6" onClick={onClose}>
      <div 
        className="w-full md:w-[600px] lg:w-[700px] h-[90%] md:h-auto md:max-h-[90vh] bg-white dark:bg-slate-800 rounded-t-[32px] md:rounded-[32px] shadow-2xl overflow-y-auto flex flex-col hide-scrollbar relative transform" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2 w-full sticky top-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur z-20 md:hidden">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
        </div>
        
        <div className="px-6 py-4 md:py-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center sticky md:static top-[28px] bg-white/95 dark:bg-slate-800/95 backdrop-blur z-20">
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{zone.name}</h2>
            <span className={`px-2.5 py-1 rounded-[8px] text-[11px] font-extrabold tracking-tight ${badgeClass}`}>{zone.status}</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 focus:outline-none hover:bg-gray-100 bg-gray-50 rounded-full transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="p-6 pt-4 space-y-6">
          {/* Detailed content */}
          <div className="grid grid-cols-2 gap-4 text-[13px] md:text-sm tracking-tight text-gray-900 dark:text-gray-100 font-medium">
            <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-[16px]">
              <p className="text-gray-400 dark:text-gray-500 font-bold mb-1">Crop Type</p>
              <p className="font-extrabold text-[15px] md:text-lg">{zone.crop}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-[16px]">
              <p className="text-gray-400 dark:text-gray-500 font-bold mb-1">Area Size</p>
              <p className="font-extrabold text-[15px] md:text-lg">Testing Pot (0.5m²)</p>
            </div>
          </div>

          {/* Moisture Chart Panel */}
          <div className="bg-white dark:bg-slate-800 border text-gray-900 dark:text-gray-100 border-gray-100 dark:border-slate-700 rounded-[20px] p-4 shadow-sm">
            <p className="text-[13px] md:text-sm font-extrabold mb-3">Moisture History</p>
            <div className="h-40 md:h-56">
              {loadingHistory ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs">Loading...</div>
              ) : historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
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
                    <Area type="monotone" dataKey="moisture" stroke="#3CC15A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMoisture)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs font-medium border border-dashed rounded-lg">No data available</div>
              )}
            </div>
          </div>

          {/* Controls Footer */}
          <div className="pb-10 md:pb-4 pt-2">
            <button
               onClick={() => onTogglePump(zone.zoneId)}
               className={`w-full py-4 rounded-[16px] text-[15px] md:text-lg font-extrabold shadow-sm transition-colors text-white ${
                 zone.pumpActive ? "bg-red-500 hover:bg-red-600" : "bg-[#3CC15A] hover:bg-[#34A853]"
               }`}
             >
               {zone.pumpActive ? "Turn Pump Off" : "Turn Pump On"}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { latestData, pumpStatus, alerts } = useSocket();

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
    const interval = setInterval(fetchZones, 30000);
    return () => clearInterval(interval);
  }, [fetchZones]);

  useEffect(() => {
    if (latestData) {
      setZones(prevZones => 
        prevZones.map(zone => {
          const isMatchingZone = zone.zoneId === "A" && 
            (latestData.device_id === "ESP32_001" || latestData.zone === "Zone A");
          
          if (isMatchingZone) {
            return { 
              ...zone, 
              soilMoisture: latestData.soilMoisture,
              temperature: latestData.temperature,
              humidity: latestData.humidity,
            };
          }
          return zone;
        })
      );
      
      if (selectedZone?.zoneId === "A") {
        setSelectedZone(prev => prev ? {
          ...prev,
          soilMoisture: latestData.soilMoisture,
          temperature: latestData.temperature,
          humidity: latestData.humidity,
        } : null);
      }
    }
  }, [latestData, selectedZone?.zoneId]);

  useEffect(() => {
    if (pumpStatus) {
      setZones(prevZones => 
        prevZones.map(zone => 
          zone.zoneId === pumpStatus.zoneId 
            ? { ...zone, pumpActive: pumpStatus.pumpActive }
            : zone
        )
      );
      if (selectedZone?.zoneId === pumpStatus.zoneId) {
        setSelectedZone(prev => prev ? {
          ...prev,
          pumpActive: pumpStatus.pumpActive
        } : null);
      }
    }
  }, [pumpStatus, selectedZone?.zoneId]);

  const handleTogglePump = async (zoneId: string) => {
    const zoneToToggle = zones.find(z => z.zoneId === zoneId);
    if (!zoneToToggle) return;
    const nextState = !zoneToToggle.pumpActive;

    setZones(prevZones => 
      prevZones.map(zone => 
        zone.zoneId === zoneId ? { ...zone, pumpActive: nextState } : zone
      )
    );
    if (selectedZone?.zoneId === zoneId) {
      setSelectedZone(prev => prev ? { ...prev, pumpActive: nextState } : null);
    }

    try {
      await togglePump(zoneId, nextState);
    } catch (error) {
       setZones(prevZones => 
        prevZones.map(zone => 
          zone.zoneId === zoneId ? { ...zone, pumpActive: !nextState } : zone
        )
      );
      if (selectedZone?.zoneId === zoneId) {
        setSelectedZone(prev => prev ? { ...prev, pumpActive: !nextState } : null);
      }
    }
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64 text-gray-500 font-bold">Loading...</div></DashboardLayout>;
  }

  // Pre-sort or artificially enforce order if needed to match mockup (Zone A, B, C)
  const sortedZones = [...zones].sort((a,b) => a.name.localeCompare(b.name));

  return (
    <DashboardLayout>
      {/* Search Bar */}
      <div className="mb-6 mt-2 relative md:max-w-md">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <input 
          type="text" 
          placeholder="Search Zones..." 
          className="w-full bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-[14px] font-extrabold py-3.5 pl-12 pr-12 rounded-[18px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] focus:outline-none focus:ring-2 focus:ring-[#3CC15A]"
        />
        <div className="absolute inset-y-0 right-4 flex items-center">
          <button className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="text-[20px] md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Zones Overview</h1>
      </div>

      {/* Grid of Zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {sortedZones.map((zone) => (
          <ZoneCardDetailed 
            key={zone.zoneId} 
            zone={zone} 
            onOpenModal={setSelectedZone}
            onTogglePump={handleTogglePump}
          />
        ))}
      </div>
      
      {/* Spacer */}
      <div className="h-6"></div>
      
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
