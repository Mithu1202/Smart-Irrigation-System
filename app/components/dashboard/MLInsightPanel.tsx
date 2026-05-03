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
}

const ALERT_STYLES = {
  none:   { bg: "bg-emerald-50 dark:bg-emerald-950/40",  border: "border-emerald-200 dark:border-emerald-800/60",  text: "text-emerald-700 dark:text-emerald-400",  dot: "bg-emerald-500" },
  low:    { bg: "bg-amber-50 dark:bg-amber-950/40",      border: "border-amber-200 dark:border-amber-800/60",      text: "text-amber-700 dark:text-amber-400",      dot: "bg-amber-500"   },
  medium: { bg: "bg-orange-50 dark:bg-orange-950/40",    border: "border-orange-200 dark:border-orange-800/60",    text: "text-orange-700 dark:text-orange-400",    dot: "bg-orange-500"  },
  high:   { bg: "bg-red-50 dark:bg-red-950/40",          border: "border-red-200 dark:border-red-800/60",          text: "text-red-700 dark:text-red-400",          dot: "bg-red-500"     },
};

// Sensible defaults so the panel works even without live ESP32 data
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
  zoneId: _zoneId,
  currentMoisture,
  temperature,
  humidity,
  pumpStatus,
}: Props) {
  const [data, setData] = useState<IoTForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const prevInputRef = useRef<string>("");

  const sm = currentMoisture && currentMoisture > 0 ? currentMoisture : DEFAULTS.soil_moisture;

  // Build sensor payload from props + defaults
  const buildPayload = useCallback(() => ({
    soil_moisture:    sm,
    soil_temp:        temperature && temperature > 0 ? temperature : DEFAULTS.soil_temp,
    air_temp:         temperature && temperature > 0 ? temperature : DEFAULTS.air_temp,
    humidity:         humidity    && humidity    > 0 ? humidity    : DEFAULTS.humidity,
    wind_speed:       DEFAULTS.wind_speed,
    rainfall:         DEFAULTS.rainfall,
    evaporation_rate: DEFAULTS.evaporation_rate,
    water_flow_rate:  DEFAULTS.water_flow_rate,
    pump_status:      pumpStatus  || DEFAULTS.pump_status,
    // lag features approximated from current value (no history needed)
    lag_1_moisture:   sm * 0.99,
    lag_2_moisture:   sm * 0.98,
    lag_3_moisture:   sm * 0.97,
    prev_moisture:    sm * 0.99,
    moisture_change:  sm * 0.01 * -1,
  }), [sm, temperature, humidity, pumpStatus]);

  const fetchPrediction = useCallback(async () => {
    const payload   = buildPayload();
    const keyStr    = JSON.stringify(payload);

    // Don't re-fetch if inputs haven't changed
    if (keyStr === prevInputRef.current && data !== null) return;
    prevInputRef.current = keyStr;

    setLoading(true);
    setError(null);
    try {
      const result = await triggerIoTPredict(payload as Record<string, unknown>);
      setData(result);
      setLastFetched(new Date());
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      const msg = e?.response?.data?.error || e?.message || "Prediction failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [buildPayload, data]);

  // Initial call + refresh every 2 minutes
  useEffect(() => {
    fetchPrediction();
    const interval = setInterval(fetchPrediction, 120_000);
    return () => clearInterval(interval);
  }, [fetchPrediction]);

  // Re-run when sensor values meaningfully change (>1% delta)
  useEffect(() => {
    if (data !== null) fetchPrediction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round((currentMoisture ?? 0) * 2), Math.round((temperature ?? 0) * 2)]);

  const alertStyle = ALERT_STYLES[(data?.alert_level ?? "none") as keyof typeof ALERT_STYLES];

  // Build chart: "Now" + 6 forecast steps (30-min intervals)
  const chartData = [];
  chartData.push({ label: "Now", moisture: sm });
  (data?.forecast ?? []).forEach((val, i) => {
    chartData.push({ label: `+${(i + 1) * 30}m`, moisture: val });
  });

  const nextMoistureChange = data
    ? (data.next_moisture ?? sm) - sm
    : null;

  return (
    <div className="rounded-[24px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] overflow-hidden transition-colors">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[12px] bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-[14px] leading-tight">ML Insight Panel</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {currentMoisture && currentMoisture > 0 ? "Live sensor data" : "Using demo values — connect ESP32 for live"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastFetched && !loading && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {lastFetched.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              onClick={() => { prevInputRef.current = ""; fetchPrediction(); }}
              disabled={loading}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40"
              title="Refresh prediction"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                className={loading ? "animate-spin text-violet-500" : "text-gray-400"}>
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* ── Error ────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="rounded-[14px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 px-4 py-3">
            <p className="text-[12px] text-red-600 dark:text-red-400 font-semibold">{error}</p>
            {error.toLowerCase().includes("not trained") && (
              <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">
                Run: <code className="bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded font-mono text-[10px]">
                  python ml/train_iot_timeseries.py
                </code>
              </p>
            )}
            {error.toLowerCase().includes("econnrefused") && (
              <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">
                Backend offline — start it with <code className="font-mono text-[10px]">npm run dev</code> in /backend
              </p>
            )}
          </div>
        )}

        {/* ── Loading skeleton ──────────────────────────────────────── */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-[90px] rounded-[16px] bg-gray-100 dark:bg-slate-700" />
              <div className="h-[90px] rounded-[16px] bg-gray-100 dark:bg-slate-700" />
            </div>
            <div className="h-[48px] rounded-[14px] bg-gray-100 dark:bg-slate-700" />
            <div className="h-[130px] rounded-[16px] bg-gray-100 dark:bg-slate-700" />
          </div>
        )}

        {/* ── Prediction cards ──────────────────────────────────────── */}
        {!loading && data?.success && (
          <>
            {/* Demo mode banner */}
            {!(currentMoisture && currentMoisture > 0) && (
              <div className="rounded-[12px] bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 px-3.5 py-2">
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                  📡 Demo mode — predictions use default values. Connect ESP32 or send live sensor data for real results.
                </p>
              </div>
            )}

            {/* Top metric cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Next moisture */}
              <div className="rounded-[16px] bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 p-3.5">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400 mb-1">
                  Next Moisture
                </div>
                <div className="text-[28px] font-extrabold text-gray-900 dark:text-gray-100 leading-none">
                  {data.next_moisture?.toFixed(1)}<span className="text-[14px] font-bold ml-0.5">%</span>
                </div>
                <div className={`text-[11px] font-semibold mt-1.5 ${
                  (nextMoistureChange ?? 0) < 0 ? "text-red-500" : "text-emerald-500"
                }`}>
                  {(nextMoistureChange ?? 0) >= 0 ? "▲" : "▼"}&nbsp;
                  {Math.abs(nextMoistureChange ?? 0).toFixed(2)}% vs now
                </div>
              </div>

              {/* Irrigation need */}
              <div className={`rounded-[16px] border p-3.5 ${
                data.irrigation_needed
                  ? "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/60"
                  : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60"
              }`}>
                <div className={`text-[10px] font-bold uppercase tracking-[0.14em] mb-1 ${
                  data.irrigation_needed
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  Irrigate?
                </div>
                <div className={`text-[28px] font-extrabold leading-none ${
                  data.irrigation_needed
                    ? "text-orange-700 dark:text-orange-300"
                    : "text-emerald-700 dark:text-emerald-300"
                }`}>
                  {data.irrigation_needed ? "YES" : "NO"}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                  {((data.irrigation_probability ?? 0) * 100).toFixed(0)}% probability
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className={`rounded-[14px] border px-4 py-3 ${alertStyle.bg} ${alertStyle.border}`}>
              <div className="flex items-start gap-2.5">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alertStyle.dot}`} />
                <p className={`text-[12px] font-medium leading-relaxed ${alertStyle.text}`}>
                  {data.recommendation}
                </p>
              </div>
            </div>

            {/* Forecast sparkline */}
            {chartData.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold text-gray-700 dark:text-gray-300">3-Hour Moisture Forecast</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">30-min intervals</span>
                </div>
                <div className="h-[130px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="mlGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.18)" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 11, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                        formatter={(v: number) => [`${v.toFixed(1)}%`, "Moisture"]}
                      />
                      <Area type="monotone" dataKey="moisture" stroke="#7C3AED" strokeWidth={2.5}
                            fill="url(#mlGrad)" dot={{ r: 3, fill: "#7C3AED", strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Model info */}
            {data.model && (
              <div className="rounded-[12px] bg-gray-50 dark:bg-slate-700/50 px-3.5 py-2.5 flex flex-wrap gap-x-4 gap-y-1">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  Reg: <strong className="text-gray-700 dark:text-gray-200">{data.model.reg}</strong>
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  Clf: <strong className="text-gray-700 dark:text-gray-200">{data.model.clf}</strong>
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  Threshold: <strong className="text-gray-700 dark:text-gray-200">{data.model.threshold}</strong>
                </span>
              </div>
            )}
          </>
        )}

        {/* ── Initial / idle state (not loading, no data, no error) ── */}
        {!loading && !data && !error && (
          <div className="py-8 text-center text-gray-400 dark:text-gray-500">
            <div className="text-3xl mb-2">🤖</div>
            <p className="text-[13px] font-medium">Click refresh to run prediction</p>
          </div>
        )}
      </div>
    </div>
  );
}
