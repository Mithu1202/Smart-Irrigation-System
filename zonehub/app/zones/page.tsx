"use client";

import { useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

// Mock data to render the 6 zones shown in the UI
const zonesData = [
  { id: "A", status: "Optimal", moisture: 45, temp: 28, pump: true, details: { crop: "Rice", area: "2.5 hct", threshold: "40%" } },
  { id: "B", status: "Dry", moisture: 45, temp: 28, pump: true, details: { crop: "Wheat", area: "1.2 hct", threshold: "50%" } },
  { id: "C", status: "Optimal", moisture: 45, temp: 28, pump: false, details: { crop: "Corn", area: "3.0 hct", threshold: "35%" } },
  { id: "D", status: "Optimal", moisture: 45, temp: 28, pump: true, details: { crop: "Soybean", area: "1.8 hct", threshold: "45%" } },
  { id: "E", status: "Wet", moisture: 45, temp: 28, pump: false, details: { crop: "Cotton", area: "5.5 hct", threshold: "60%" } },
  { id: "F", status: "Optimal", moisture: 45, temp: 28, pump: true, details: { crop: "Rice", area: "2.1 hct", threshold: "40%" } },
];

const moistureData = [
  { time: '00:00', value: 40 }, { time: '04:00', value: 65 }, { time: '08:00', value: 30 },
  { time: '12:00', value: 45 }, { time: '16:00', value: 45 }, { time: '20:00', value: 85 },
  { time: '24:00', value: 35 }, { time: '28:00', value: 20 }, { time: '32:00', value: 60 }
];

const tempData = [
  { time: '00:00', soil: 20, air: 25, ambient: 22 }, { time: '04:00', soil: 45, air: 30, ambient: 35 },
  { time: '08:00', soil: 25, air: 35, ambient: 28 }, { time: '12:00', soil: 35, air: 40, ambient: 30 },
  { time: '16:00', soil: 55, air: 35, ambient: 45 }, { time: '20:00', soil: 65, air: 85, ambient: 50 },
  { time: '24:00', soil: 35, air: 25, ambient: 40 }, { time: '28:00', soil: 45, air: 60, ambient: 50 },
  { time: '32:00', soil: 40, air: 55, ambient: 65 }
];

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

function ZoneCardDetailed({ zone, onOpenModal }: { zone: typeof zonesData[0]; onOpenModal: (z: typeof zonesData[0]) => void }) {
  // Determine badge styles based on status
  let badgeClass = "bg-[#EEFBF2] text-[#3CC15A]"; // Default optimal
  if (zone.status === "Dry") badgeClass = "bg-red-50 text-red-500";
  if (zone.status === "Wet") badgeClass = "bg-blue-50 text-blue-500";

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-gray-900 text-lg">Zone {zone.id}</h3>
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
            <span className="text-sm font-bold text-gray-900">{zone.moisture}%</span>
            <CircularIndicator percentage={zone.moisture} colorClass="text-gray-100" highlightClass="text-[#3CC15A]" />
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
            <span className="text-sm font-bold text-gray-900">{zone.temp}°C</span>
            <CircularIndicator percentage={zone.temp} colorClass="text-gray-100" highlightClass="text-red-500" />
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
             {zone.pump ? (
               <div className="w-12 h-6 bg-[#3CC15A] rounded-full relative p-1 cursor-pointer shadow-inner">
                 <div className="w-4 h-4 bg-white rounded-full absolute right-1 shadow-sm"></div>
               </div>
             ) : (
               <div className="w-12 h-6 bg-gray-200 rounded-full relative p-1 cursor-pointer shadow-inner">
                 <div className="w-4 h-4 bg-white rounded-full absolute left-1 shadow-sm"></div>
               </div>
             )}
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

function ZoneDetailsModal({ zone, onClose }: { zone: typeof zonesData[0]; onClose: () => void }) {
  let badgeClass = "bg-[#EEFBF2] text-[#3CC15A]";
  if (zone.status === "Dry") badgeClass = "bg-red-50 text-red-500";
  if (zone.status === "Wet") badgeClass = "bg-blue-50 text-blue-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col hide-scrollbar relative">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur z-10 p-6 pb-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Zone {zone.id}</h2>
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${badgeClass}`}>{zone.status}</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="p-6 pt-4 space-y-6">
          {/* Details Row */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1 font-medium">Zone ID: <span className="font-bold text-gray-900">ZN-00{zone.id.charCodeAt(0) - 64}</span></p>
              <p className="text-gray-500 font-medium">Crop Type: <span className="font-bold text-gray-900">{zone.details.crop}</span></p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 font-medium">Area Size: <span className="font-bold text-gray-900">{zone.details.area}</span></p>
              <p className="text-gray-500 font-medium">Moisture Threshold: <span className="font-bold text-gray-900">{zone.details.threshold}</span></p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 1 */}
            <div className="border border-gray-100 rounded-xl p-3 h-48 bg-gray-50/50">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={moistureData}>
                  <defs>
                    <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="time" hide />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorMoisture)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Chart 2 */}
            <div className="border border-gray-100 rounded-xl p-3 h-48 bg-gray-50/50">
               <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="time" hide />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="soil" stroke="#3CC15A" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="air" stroke="#EF4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ambient" stroke="#60A5FA" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Aggregates */}
          <div className="flex justify-between items-center text-sm font-bold text-gray-900 py-2">
            <span>AVG Moisture: 43%</span>
            <span>Irrigation Count: 5 times/week</span>
          </div>

          {/* Table */}
          <div>
            <h4 className="font-bold text-gray-900 text-sm mb-3">Irrigation History</h4>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200">
                  <tr className="text-gray-500 font-bold bg-white">
                    <th className="px-4 py-3 font-bold">Time</th>
                    <th className="px-4 py-3 font-bold">Duration</th>
                    <th className="px-4 py-3 font-bold text-right">Mode</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 text-gray-900 font-medium">08:30 AM</td>
                    <td className="px-4 py-3 text-gray-500 font-medium">10 min</td>
                    <td className="px-4 py-3 text-gray-500 font-medium text-right">Auto</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-900 font-medium">08:30 AM</td>
                    <td className="px-4 py-3 text-gray-500 font-medium">05 min</td>
                    <td className="px-4 py-3 text-gray-500 font-medium text-right">Manual</td>
                  </tr>
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
  const [selectedZone, setSelectedZone] = useState<typeof zonesData[0] | null>(null);

  return (
    <DashboardLayout>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 mb-1">Zone Overview</h1>
          <p className="text-gray-500 text-[13px] font-medium">Live soil and pump status for every zone</p>
        </div>

        <div className="flex items-center gap-6">
          {/* Filters */}
          <div className="flex items-center text-[13px] font-bold">
            <button className="text-[#3CC15A] border-b-2 border-[#3CC15A] pb-1 px-1">All</button>
            <span className="text-gray-300 mx-2">|</span>
            <button className="text-gray-500 hover:text-gray-800 transition pb-1 px-1">Wet</button>
            <span className="text-gray-300 mx-2">|</span>
            <button className="text-gray-500 hover:text-gray-800 transition pb-1 px-1">Dry Zones</button>
          </div>

          {/* Add New Zone Button */}
          <button className="bg-[#3CC15A] hover:bg-[#34A853] text-white px-5 py-2.5 rounded-[10px] text-[13px] font-bold shadow-sm transition-colors">
            Add New Zone +
          </button>
        </div>
      </div>

      {/* Grid of Zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {zonesData.map((zone) => (
          <ZoneCardDetailed key={zone.id} zone={zone} onOpenModal={setSelectedZone} />
        ))}
      </div>
      <div className="h-8"></div>
      
      {/* Modal Overlay Component */}
      {selectedZone && (
        <ZoneDetailsModal zone={selectedZone} onClose={() => setSelectedZone(null)} />
      )}
    </DashboardLayout>
  );
}
