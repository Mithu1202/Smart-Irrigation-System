import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

export interface ChartDataPoint {
  time: string;
  moisture: number;
  temperature: number;
  humidity: number;
  soilTemp: number;
}

export interface WeeklyTrend {
  day: string;
  date: string;
  moisture: number | null;
  temperature: number | null;
  readings: number;
}

export interface IrrigationEvent {
  type: "start" | "stop";
  timestamp: string;
  zone: string;
  moisture: number;
  temperature: number;
  trigger: string;
}

export interface AlertData {
  type: "critical" | "warning";
  title: string;
  message: string;
  zone: string;
  value: number;
  threshold: number;
  timestamp: string;
}

export interface ReportStats {
  zones: { total: number; active: number };
  last24h: {
    readings: number;
    avgMoisture: number;
    avgTemp: number;
    avgHumidity: number;
    pumpOnTime: number;
    pumpOnPercentage: number;
  };
  savings: { waterSaved: number; estimatedLiters: number };
}

export const getLatestData = async () => {
  const res = await api.get("/data/latest");
  return res.data;
};

export const getZones = async () => {
  const res = await api.get("/zones");
  return res.data;
};

export const getZone = async (zoneId: string) => {
  const res = await api.get(`/zones/${zoneId}`);
  return res.data;
};

export const getZoneHistory = async (zoneId: string, limit = 50): Promise<ChartDataPoint[]> => {
  const res = await api.get(`/zones/${zoneId}/history?limit=${limit}`);
  return res.data;
};

export const createZone = async (zoneData: unknown) => {
  const res = await api.post("/zones", zoneData);
  return res.data;
};

export const updateZone = async (zoneId: string, zoneData: unknown) => {
  const res = await api.put(`/zones/${zoneId}`, zoneData);
  return res.data;
};

export const deleteZone = async (zoneId: string) => {
  const res = await api.delete(`/zones/${zoneId}`);
  return res.data;
};

export const togglePump = async (zoneId: string, pumpActive?: boolean) => {
  const res = await api.post(`/zones/${zoneId}/pump`, { pumpActive });
  return res.data;
};

export const seedZones = async () => {
  const res = await api.post("/zones/seed");
  return res.data;
};

// ==================== REPORTS API ====================

export const getWeeklyTrend = async (): Promise<{ trends: WeeklyTrend[]; stats: { avg: number; max: number; min: number } }> => {
  const res = await api.get("/zones/reports/weekly-trend");
  return res.data;
};

export const getIrrigationHistory = async (limit = 20): Promise<{
  events: IrrigationEvent[];
  totalEvents: number;
  estimatedWaterUsage: number;
  pumpOnTime: number;
}> => {
  const res = await api.get(`/zones/reports/irrigation-history?limit=${limit}`);
  return res.data;
};

export const getAlertsHistory = async (limit = 50): Promise<{
  alerts: AlertData[];
  total: number;
  summary: { critical: number; warning: number };
}> => {
  const res = await api.get(`/zones/reports/alerts?limit=${limit}`);
  return res.data;
};

export const getReportStats = async (): Promise<ReportStats> => {
  const res = await api.get("/zones/reports/stats");
  return res.data;
};

export default api;