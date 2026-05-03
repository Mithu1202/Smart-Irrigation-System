"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { triggerIoTPredict, type IoTForecastResponse } from "../../../lib/api";

interface Props {
  zoneId?: string;
  currentMoisture?: number;
  temperature?: number;
  humidity?: number;
  pumpStatus?: string;
  refreshTrigger?: number;
}

const ALERT_STYLES = {
  none:   { bg: "bg-emerald-50 dark:bg-emerald-950/40",  border: "border-emerald-200 dark:border-emerald-800/60",  text: "text-emerald-700 dark:text-emerald-400",  dot: "bg-emerald-500" },
  low:    { bg: "bg-amber-50 dark:bg-amber-950/40",      border: "border-amber-200 dark:border-amber-800/60",      text: "text-amber-700 dark:text-amber-400",      dot: "bg-amber-500"   },
  medium: { bg: "bg-orange-50 dark:bg-orange-950/40",    border: "border-orange-200 dark:border-orange-800/60",    text: "text-orange-700 dark:text-orange-400",    dot: "bg-orange-500"  },
  high:   { bg: "bg-red-50 dark:bg-red-950/40",          border: "border-red-200 dark:border-red-800/60",          text: "text-red-700 dark:text-red-400",          dot: "bg-red-500"     },
};

const DEFAULTS = {
  soil_moisture:    65.0,
  soil_temp:        26.0,
  air_temp:         30.0,
  humidity:         60.0,
  wind_speed:       8.0,
  rainfall:         0.0,
  evaporation_rate: 3.0,
  water_flow_rate:  0.0,
  pump_status:      "OFF",
};

export default function MLInsightPanel({
  zoneId,
  currentMoisture,
  temperature,
  humidity,
  pumpStatus,
  refreshTrigger = 0,
}: Props) {
  const [data, setData] = useState<IoTForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  
  const sm = currentMoisture && currentMoisture > 0 ? currentMoisture : DEFAULTS.soil_moisture;
  
  // Use refs to store latest sensor values without triggering re-renders
  const sensorRefs = useRef({ sm, temperature, humidity, pumpStatus });
  useEffect(() => {
    sensorRefs.current = { sm, temperature, humidity, pumpStatus };
  }, [sm, temperature, humidity, pumpStatus]);

  // Run prediction ONLY when triggered (timed by backend every 5 min) or manually
  useEffect(() => {
    const runPrediction = async () => {
      const current = sensorRefs.current;
      const payload = {
        soil_moisture:    current.sm,
        soil_temp:        current.temperature || DEFAULTS.soil_temp,
        air_temp:         current.temperature || DEFAULTS.air_temp,
        humidity:         current.humidity    || DEFAULTS.humidity,
        wind_speed:       DEFAULTS.wind_speed,
        rainfall:         DEFAULTS.rainfall,
        evaporation_rate: DEFAULTS.evaporation_rate,
        water_flow_rate:  DEFAULTS.water_flow_rate,
        pump_status:      current.pumpStatus  || DEFAULTS.pump_status,
        lag_1_moisture:   current.sm * 0.99,
        lag_2_moisture:   current.sm * 0.98,
        lag_3_moisture:   current.sm * 0.97,
        prev_moisture:    current.sm * 0.99,
        moisture_change:  -0.5,
      };

      setLoading(true);
      setError(null);
      try {
        const result = await triggerIoTPredict(payload as Record<string, unknown>);
        setData(result);
        setLastFetched(new Date());
      } catch (err: any) {
        setError(err.message || "Prediction failed");
      } finally {
        setLoading(false);
      }
    };

    runPrediction();
  }, [refreshTrigger]);

  const alertStyle = ALERT_STYLES[(data?.alert_level ?? "none") as keyof typeof ALERT_STYLES];

  const chartData = [];
  chartData.push({ label: "Now", moisture: sm });
  (data?.forecast ?? []).forEach((val, i) => {
    chartData.push({ label: `+${(i + 1) * 30}m`, moisture: val });
  });

  const nextMoistureChange = data ? (data.next_moisture ?? sm) - sm : null;

  return (
    <div className="rounded-[24px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] overflow-hidden transition-colors">
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[12px] bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-[14px] leading-tight">ML Insight Panel</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Throttled: Updates every 5m</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastFetched && <span className="text-[10px] text-gray-400">{lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-20 bg-gray-100 dark:bg-slate-700 rounded-xl" />
            <div className="h-20 bg-gray-100 dark:bg-slate-700 rounded-xl" />
          </div>
        ) : data?.success ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[16px] bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 p-3.5">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600 mb-1">Next Moisture</div>
                <div className="text-[28px] font-extrabold text-gray-900 dark:text-gray-100">{data.next_moisture?.toFixed(1)}%</div>
                <div className={`text-[11px] font-semibold mt-1 ${nextMoistureChange && nextMoistureChange < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {nextMoistureChange && nextMoistureChange < 0 ? '▼' : '▲'} {Math.abs(nextMoistureChange || 0).toFixed(1)}% vs now
                </div>
              </div>
              <div className={`rounded-[16px] border p-3.5 ${data.irrigation_needed ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1">Irrigate?</div>
                <div className="text-[28px] font-extrabold">{data.irrigation_needed ? 'YES' : 'NO'}</div>
                <div className="text-[11px] opacity-70">{((data.irrigation_probability || 0) * 100).toFixed(0)}% prob</div>
              </div>
            </div>

            <div className={`rounded-[14px] border px-4 py-3 ${alertStyle.bg} ${alertStyle.border}`}>
              <p className={`text-[12px] font-medium ${alertStyle.text}`}>{data.recommendation}</p>
            </div>

            <div className="h-[130px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Area type="monotone" dataKey="moisture" stroke="#7C3AED" fill="#7C3AED20" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
               <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  <span>AI Efficiency</span>
                  <span className="text-emerald-500">Active</span>
               </div>
               <div className="mt-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3">
                  <p className="text-[12px] text-emerald-800 dark:text-emerald-300">
                     <strong>Insight:</strong> System is in high-efficiency mode. Predicting 5-min intervals to save energy.
                  </p>
               </div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-gray-400 italic">Waiting for 5m refresh...</div>
        )}
      </div>
    </div>
  );
}
