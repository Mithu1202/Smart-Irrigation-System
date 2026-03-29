"use client";

import DashboardLayout from "../components/layout/DashboardLayout";
import { useEffect, useState, useCallback } from "react";
import { getZones, getWeeklyTrend, getIrrigationHistory, getAlertsHistory, getReportStats, IrrigationEvent, AlertData, ReportStats, ZoneTrendData } from "../../lib/api";
import { useSocket } from "../../lib/useSocket";

interface Zone {
  zoneId: string;
  name: string;
  soilMoisture?: number;
  temperature?: number;
  humidity?: number;
  pumpActive?: boolean;
  crop?: string;
  thresholds?: { moistureMin: number; moistureMax: number; tempMax: number };
}

interface Recommendation {
  type: "success" | "warning" | "danger" | "info";
  title: string;
  description: string;
  action?: string;
  priority: number;
  zone?: string;
}

function generateRecommendations(zones: Zone[], latestData: any): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  zones.forEach(zone => {
    const moisture = zone.soilMoisture || latestData?.soilMoisture || 0;
    const temp = zone.temperature || latestData?.temperature || 0;
    const humidity = latestData?.humidity || 0;
    const thresholds = zone.thresholds || { moistureMin: 30, moistureMax: 70, tempMax: 35 };

    if (moisture < thresholds.moistureMin) {
      recommendations.push({
        type: "danger",
        title: "Immediate Irrigation Needed",
        description: `${zone.name} has critically low soil moisture (${moisture}%). Crops may experience water stress.`,
        action: "Activate irrigation for 15-20 minutes",
        priority: 1,
        zone: zone.name,
      });
    } else if (moisture < thresholds.moistureMin + 10) {
      recommendations.push({
        type: "warning",
        title: "Schedule Irrigation Soon",
        description: `${zone.name} moisture is dropping (${moisture}%). Plan irrigation within 2-4 hours.`,
        action: "Schedule automated irrigation",
        priority: 2,
        zone: zone.name,
      });
    }

    if (moisture > thresholds.moistureMax) {
      recommendations.push({
        type: "warning",
        title: "Reduce Irrigation",
        description: `${zone.name} has high moisture (${moisture}%). Risk of root rot and fungal diseases.`,
        action: "Pause irrigation for 24 hours",
        priority: 2,
        zone: zone.name,
      });
    }

    if (temp > thresholds.tempMax) {
      recommendations.push({
        type: "warning",
        title: "High Temperature Alert",
        description: `${zone.name} temperature is ${temp}°C. Consider increasing irrigation frequency.`,
        action: "Increase watering by 20%",
        priority: 2,
        zone: zone.name,
      });
    }

    if (moisture >= thresholds.moistureMin && moisture <= thresholds.moistureMax && temp < thresholds.tempMax) {
      recommendations.push({
        type: "success",
        title: "Optimal Conditions",
        description: `${zone.name} is in ideal range. Moisture: ${moisture}%, Temp: ${temp}°C.`,
        priority: 5,
        zone: zone.name,
      });
    }
  });

  if (latestData?.humidity && latestData.humidity < 40) {
    recommendations.push({
      type: "info",
      title: "Low Humidity Detected",
      description: `Air humidity is ${latestData.humidity}%. Plants may need more frequent light watering.`,
      action: "Consider misting or drip irrigation",
      priority: 3,
    });
  }

  return recommendations.sort((a, b) => a.priority - b.priority);
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const colors = {
    success: { bg: "bg-green-50", border: "border-green-200", icon: "text-green-500", badge: "bg-green-100 text-green-700" },
    warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500", badge: "bg-amber-100 text-amber-700" },
    danger: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-500", badge: "bg-red-100 text-red-700" },
    info: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-500", badge: "bg-blue-100 text-blue-700" },
  };
  const c = colors[rec.type];

  const icons = {
    success: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    warning: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    danger: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
    info: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  };

  return (
    <div className={`${c.bg} ${c.border} border rounded-2xl p-5 transition-all hover:shadow-md`}>
      <div className="flex items-start gap-4">
        <div className={`${c.icon} shrink-0 mt-0.5`}>{icons[rec.type]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-gray-900 text-[15px]">{rec.title}</h3>
            {rec.zone && (
              <span className={`${c.badge} text-[10px] font-bold px-2 py-0.5 rounded-full`}>{rec.zone}</span>
            )}
          </div>
          <p className="text-gray-600 text-[13px] mb-3">{rec.description}</p>
          {rec.action && (
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-gray-500">Suggested Action:</span>
              <span className="text-[12px] font-bold text-gray-800">{rec.action}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, subtitle, icon, color }: { title: string; value: string | number; subtitle: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center`}>{icon}</div>
        <span className="text-[13px] font-semibold text-gray-500">{title}</span>
      </div>
      <div className="text-[28px] font-extrabold text-gray-900 tracking-tight">{value}</div>
      <div className="text-[12px] text-gray-400 mt-1">{subtitle}</div>
    </div>
  );
}

function WaterSavingsCard({ stats }: { stats: ReportStats | null }) {
  const savings = stats?.savings?.waterSaved || 0;
  const liters = stats?.savings?.estimatedLiters || 0;
  const pumpOnTime = stats?.last24h?.pumpOnTime || 0;
  const avgMoisture = stats?.last24h?.avgMoisture || 0;

  return (
    <div className="bg-gradient-to-br from-[#3CC15A] to-[#2DA44E] rounded-2xl p-6 text-white">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
        Water Usage Insights
      </h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-[32px] font-extrabold">{liters}L</div>
          <div className="text-white/80 text-[13px]">Estimated saved</div>
        </div>
        <div>
          <div className="text-[32px] font-extrabold">{savings}%</div>
          <div className="text-white/80 text-[13px]">Savings vs manual</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-white/20">
        <div>
          <div className="text-[18px] font-bold">{pumpOnTime} min</div>
          <div className="text-white/70 text-[11px]">Pump runtime (24h)</div>
        </div>
        <div>
          <div className="text-[18px] font-bold">{avgMoisture}%</div>
          <div className="text-white/70 text-[11px]">Avg moisture (24h)</div>
        </div>
      </div>
      <div className="bg-white/20 rounded-xl p-4">
        <div className="text-[13px] font-semibold mb-2">💡 Smart Tip</div>
        <div className="text-[12px] text-white/90">
          {avgMoisture > 60 
            ? "Soil moisture is good. Delay next irrigation by 2 hours to save water."
            : avgMoisture > 40
            ? "Optimal range maintained. Continue current schedule."
            : "Consider increasing irrigation duration by 10% for better coverage."}
        </div>
      </div>
    </div>
  );
}

function ZoneWiseTrendCard({ zonesData }: { zonesData: ZoneTrendData[] }) {
  const colors = ["#3CC15A", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
  
  if (zonesData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 text-[15px] mb-4">Weekly Moisture by Zone</h3>
        <div className="text-center py-8 text-gray-400 text-[13px]">No zone data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-900 text-[15px] mb-4">Weekly Moisture by Zone</h3>
      
      {/* Zone Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {zonesData.map((z, i) => (
          <div key={z.zoneId} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-[11px] font-semibold text-gray-600">{z.zone}</span>
            <span className="text-[10px] text-gray-400">({z.stats.avg}% avg)</span>
          </div>
        ))}
      </div>

      {/* Bar Chart Grid */}
      <div className="flex items-end justify-between gap-1 h-32">
        {zonesData[0]?.trends.map((_, dayIdx) => (
          <div key={dayIdx} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex items-end justify-center gap-0.5 h-full">
              {zonesData.map((zoneData, zoneIdx) => {
                const moisture = zoneData.trends[dayIdx]?.moisture || 0;
                const maxMoisture = Math.max(...zonesData.flatMap(z => z.trends.map(t => t.moisture || 0)), 1);
                return (
                  <div 
                    key={zoneData.zoneId}
                    className="rounded-t transition-all hover:opacity-80"
                    style={{ 
                      backgroundColor: colors[zoneIdx % colors.length],
                      width: `${100 / zonesData.length - 2}%`,
                      height: `${(moisture / maxMoisture) * 100}%`,
                      minHeight: moisture > 0 ? "4px" : "0"
                    }}
                    title={`${zoneData.zone}: ${moisture}%`}
                  />
                );
              })}
            </div>
            <span className="text-[9px] font-semibold text-gray-400">{zonesData[0]?.trends[dayIdx]?.day}</span>
          </div>
        ))}
      </div>

      {/* Zone Stats */}
      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-3 gap-3">
        {zonesData.map((z, i) => (
          <div key={z.zoneId} className="bg-gray-50 rounded-lg p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
              <span className="text-[11px] font-bold text-gray-700">{z.zone}</span>
            </div>
            <div className="text-[10px] text-gray-500 space-x-2">
              <span>Avg: <strong>{z.stats.avg}%</strong></span>
              <span>Max: <strong className="text-green-600">{z.stats.max}%</strong></span>
              <span>Min: <strong className="text-red-500">{z.stats.min}%</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IrrigationHistoryCard({ events }: { events: IrrigationEvent[] }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-900 text-[15px] mb-4 flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
        Irrigation History
      </h3>
      {events.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-[13px]">
          No irrigation events recorded yet
        </div>
      ) : (
        <div className="space-y-3 max-h-[250px] overflow-y-auto">
          {events.slice(0, 8).map((event, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${event.type === "start" ? "bg-green-100" : "bg-red-100"}`}>
                {event.type === "start" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                )}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-gray-900">
                  Pump {event.type === "start" ? "Started" : "Stopped"}
                </div>
                <div className="text-[11px] text-gray-400">
                  {event.zone} • {event.trigger === "manual" ? "Manual" : "Auto"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-medium text-gray-600">
                  {new Date(event.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="text-[10px] text-gray-400">
                  {new Date(event.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertsHistoryCard({ alerts }: { alerts: AlertData[] }) {
  const getColor = (type: string) => type === "critical" ? "bg-red-500" : "bg-amber-500";

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-900 text-[15px] mb-4 flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        Recent Alerts
        {alerts.length > 0 && (
          <span className="ml-auto bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{alerts.length}</span>
        )}
      </h3>
      {alerts.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <p className="text-gray-400 text-[13px]">No alerts recorded</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[250px] overflow-y-auto">
          {alerts.slice(0, 8).map((alert, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <div className={`w-2 h-2 rounded-full mt-1.5 ${getColor(alert.type)}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-gray-900">{alert.title}</div>
                <div className="text-[11px] text-gray-500 truncate">{alert.message}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] font-medium text-gray-500">
                  {new Date(alert.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="text-[10px] text-gray-400">{alert.zone}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const { latestData, isConnected } = useSocket();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [zoneTrends, setZoneTrends] = useState<ZoneTrendData[]>([]);
  const [irrigationHistory, setIrrigationHistory] = useState<IrrigationEvent[]>([]);
  const [alertsHistory, setAlertsHistory] = useState<AlertData[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [zonesRes, trendRes, historyRes, alertsRes, statsRes] = await Promise.all([
        getZones().catch(() => []),
        getWeeklyTrend().catch(() => ({ zones: [] })),
        getIrrigationHistory(20).catch(() => ({ events: [] })),
        getAlertsHistory(50).catch(() => ({ alerts: [] })),
        getReportStats().catch(() => null),
      ]);
      
      setZones(zonesRes);
      setZoneTrends(trendRes.zones || []);
      setIrrigationHistory(historyRes.events || []);
      setAlertsHistory(alertsRes.alerts || []);
      setStats(statsRes);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (zones.length > 0 || latestData) {
      const recs = generateRecommendations(zones, latestData);
      setRecommendations(recs);
    }
  }, [zones, latestData]);

  const criticalCount = recommendations.filter(r => r.type === "danger").length;
  const warningCount = recommendations.filter(r => r.type === "warning").length;
  const healthyCount = recommendations.filter(r => r.type === "success").length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-64 flex items-center justify-center text-gray-500">Loading reports...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <h1 className="text-[20px] font-extrabold text-gray-900 tracking-tight">Decision Support</h1>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-[#3CC15A]" : "bg-gray-400"}`}></div>
            <span className={`text-[10px] font-bold ${isConnected ? "text-[#3CC15A]" : "text-gray-400"}`}>
              {isConnected ? "Live Data" : "Connecting..."}
            </span>
          </div>
        </div>
        <p className="text-gray-500 text-[13px] font-medium">
          AI-powered recommendations for optimal irrigation
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Critical Issues"
          value={criticalCount}
          subtitle="Needs immediate action"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
          color="bg-red-500"
        />
        <SummaryCard
          title="Warnings"
          value={warningCount}
          subtitle="Monitor closely"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
          color="bg-amber-500"
        />
        <SummaryCard
          title="Healthy Zones"
          value={healthyCount}
          subtitle="Operating optimally"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
          color="bg-green-500"
        />
        <SummaryCard
          title="Active Zones"
          value={stats?.zones?.total || zones.length}
          subtitle="Total monitored"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>}
          color="bg-blue-500"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Recommendations - 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-gray-900 text-[16px] flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3CC15A" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Smart Recommendations
          </h2>
          
          {recommendations.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">All Systems Optimal</h3>
              <p className="text-gray-500 text-[13px]">No recommendations at this time. Your irrigation system is running efficiently.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <RecommendationCard key={i} rec={rec} />
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar - Water Savings */}
        <div className="space-y-4">
          <WaterSavingsCard stats={stats} />
        </div>
      </div>

      {/* Zone-Wise Trend Chart - Full Width */}
      <div className="mb-6">
        <ZoneWiseTrendCard zonesData={zoneTrends} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <IrrigationHistoryCard events={irrigationHistory} />
        <AlertsHistoryCard alerts={alertsHistory} />
      </div>
    </DashboardLayout>
  );
}
