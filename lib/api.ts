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

export default api;