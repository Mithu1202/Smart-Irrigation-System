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

export interface EnrichedReading {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  soilMoistureRaw?: number;
  moistureTrend: number;
  avgMoisture_24h: number;
  thresholdGap: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  irrigationNeed: boolean;
  timeOfDay: string;
  temperatureDelta: number;
  humidityDelta: number;
  moistureVolatility: number;
  waterStressIndex: number;
  recentIrrigationCount: number;
  timestamp?: string;
}

export interface ROIResponse {
  zone: { zoneId: string; name: string };
  baselineWater: number;
  optimizedWater: number;
  waterSaved: number;
  costSaving: number;
  systemCost: number;
  roi: number;
  efficiencyGain: number;
  sampleSize?: number;
}

export interface AgentQueryResponse {
  question: string;
  decision: string;
  reason: string;
  action: string;
  confidence: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  answer?: string;
  assistantMessage?: string;
  mode?: "decision" | "logs" | "guidance" | "crop" | "qa" | "roi";
  openRouter?: {
    configured: boolean;
    model: string;
  };
  llmOutput?: {
    decision?: string;
    reason?: string;
    action?: string;
    summary?: string;
    nextSteps?: string[];
    [key: string]: unknown;
  } | null;
  data: {
    zone: unknown;
    realtime: unknown;
    trend: unknown;
    thresholdGap: unknown;
    risk: unknown;
    prediction: unknown;
    roi: unknown;
    irrigationLogs?: unknown;
    cropEvidence?: unknown;
    recommendedCrops?: unknown;
    evidence?: string[];
    nextSteps?: string[];
  };
  retrieval: unknown;
  websiteContext?: unknown;
  toolTrace: unknown[];
}

export interface IrrigationLogsResponse {
  zone: unknown;
  dateRange: { start: string; end: string } | null;
  summary: {
    count: number;
    pumpOnCount: number;
    criticalCount: number;
    avgMoisture: number;
    avgTemperature: number;
  };
  logs: unknown[];
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

export interface ZoneTrendData {
  zone: string;
  zoneId: string;
  trends: { day: string; moisture: number | null }[];
  stats: { avg: number; max: number; min: number };
}

export const getWeeklyTrend = async (zone?: string): Promise<{ 
  trends?: WeeklyTrend[]; 
  stats?: { avg: number; max: number; min: number };
  zones?: ZoneTrendData[];
  zone?: string;
}> => {
  const url = zone 
    ? `/zones/reports/weekly-trend?zone=${encodeURIComponent(zone)}`
    : "/zones/reports/weekly-trend";
  const res = await api.get(url);
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

export const getEnrichedData = async (zone?: string, limit = 20): Promise<{
  zone: unknown;
  count: number;
  enriched: EnrichedReading[];
}> => {
  const url = zone
    ? `/analytics/enriched-data?zone=${encodeURIComponent(zone)}&limit=${limit}`
    : `/analytics/enriched-data?limit=${limit}`;
  const res = await api.get(url);
  return res.data;
};

export const getROIAnalysis = async (
  zone?: string,
  params?: { systemCost?: number; costPerLiter?: number; litersPerReading?: number }
): Promise<ROIResponse> => {
  const query = new URLSearchParams();
  if (zone) query.set("zone", zone);
  if (params?.systemCost !== undefined) query.set("systemCost", String(params.systemCost));
  if (params?.costPerLiter !== undefined) query.set("costPerLiter", String(params.costPerLiter));
  if (params?.litersPerReading !== undefined) query.set("litersPerReading", String(params.litersPerReading));

  const res = await api.get(`/analytics/roi${query.toString() ? `?${query.toString()}` : ""}`);
  return res.data;
};

export const queryAgent = async (
  question: string,
  options?: {
    zone?: string;
    systemCost?: number;
    costPerLiter?: number;
    litersPerReading?: number;
  }
): Promise<AgentQueryResponse> => {
  const res = await api.post("/agent/query", {
    question,
    ...options,
  });
  return res.data;
};

export const getIrrigationLogs = async (
  date?: string,
  zone?: string,
  limit = 20
): Promise<IrrigationLogsResponse> => {
  const query = new URLSearchParams();
  if (date) query.set("date", date);
  if (zone) query.set("zone", zone);
  query.set("limit", String(limit));
  const res = await api.get(`/analytics/logs?${query.toString()}`);
  return res.data;
};

// ==================== IoT ML API ====================

export interface IoTForecastResponse {
  success: boolean;
  zoneId: string;
  current_moisture: number;
  timestamp: string;
  forecast: number[];                // 6-step recursive moisture forecast
  next_moisture: number;             // t+1 regression prediction
  next_moisture_change?: number;     // delta vs current moisture
  irrigation_needed: boolean;        // threshold-tuned classification
  irrigation_probability: number;    // raw probability
  alert_level: "none" | "low" | "medium" | "high";
  recommendation: string;
  model?: { reg: string; clf: string; threshold: number };
  error?: string;
}

export interface IoTModelStatus {
  modelTrained: boolean;
  message: string;
  metadata?: {
    trained_at: string;
    reg_model: string;
    reg_rmse: number;
    reg_r2: number;
    clf_model: string;
    clf_f1: number;
    clf_recall: number;
    optimal_threshold: number;
    n_samples: number;
    irrigation_rate: number;
  };
}

export const getIoTForecast = async (zoneId: string): Promise<IoTForecastResponse> => {
  const res = await api.get(`/ml/iot-forecast/${zoneId}`);
  return res.data;
};

export const getIoTModelStatus = async (): Promise<IoTModelStatus> => {
  const res = await api.get("/ml/iot-status");
  return res.data;
};

export const triggerIoTPredict = async (sensorData: Record<string, unknown>): Promise<IoTForecastResponse> => {
  const res = await api.post("/ml/iot-predict", sensorData);
  return res.data;
};

export const triggerIoTTraining = async (): Promise<void> => {
  await api.post("/ml/iot-train");
};

export default api;
