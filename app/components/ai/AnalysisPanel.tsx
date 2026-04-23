"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  getEnrichedData,
  getROIAnalysis,
  queryAgent,
  type AgentQueryResponse,
  type EnrichedReading,
  type ROIResponse,
  type IrrigationLogsResponse,
} from "../../../lib/api";

type ZoneOption = {
  zoneId: string;
  name: string;
};

type Props = {
  zones: ZoneOption[];
  selectedZone: string;
  latestZone?: string;
  className?: string;
};

const presetQuestions = [
  "Which zone needs irrigation right now?",
  "Show today's irrigation logs for Zone A.",
  "What happened on the 23rd irrigation logs?",
  "Explain the moisture trend and risk level for this zone.",
  "What is the ROI impact if we keep the current irrigation plan?",
  "Summarize the key operational insight from the chart.",
];

const formatPercent = (value: number) =>
  `${Math.round((Number(value) || 0) * 10) / 10}%`;

const formatMoney = (value: number) =>
  `$${(Number(value) || 0).toFixed(2)}`;

export default function AnalysisPanel({
  zones,
  selectedZone,
  latestZone,
  className = "",
}: Props) {
  const activeZoneId = useMemo(() => {
    if (selectedZone !== "default") return selectedZone;
    return latestZone || zones[0]?.zoneId || "";
  }, [selectedZone, latestZone, zones]);

  const activeZone = useMemo(
    () => zones.find((zone) => zone.zoneId === activeZoneId) || null,
    [zones, activeZoneId]
  );

  const [chartData, setChartData] = useState<EnrichedReading[]>([]);
  const [roi, setROI] = useState<ROIResponse | null>(null);
  const [question, setQuestion] = useState(presetQuestions[0]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready for analysis");
  const [result, setResult] = useState<AgentQueryResponse | null>(null);
  const [history, setHistory] = useState<AgentQueryResponse[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadAnalysisData = async () => {
      if (!activeZoneId) {
        setChartData([]);
        setROI(null);
        return;
      }

      try {
        const [enrichedRes, roiRes] = await Promise.all([
          getEnrichedData(activeZoneId, 24),
          getROIAnalysis(activeZoneId).catch(() => null),
        ]);

        if (!mounted) return;
        setChartData((enrichedRes.enriched || []).reverse());
        setROI(roiRes);

        if (enrichedRes.enriched?.length) {
          const latest = enrichedRes.enriched[0];
          setStatus(
            `${latest.riskLevel} risk, ${formatPercent(latest.thresholdGap)} gap, ${latest.irrigationNeed ? "irrigation needed" : "monitoring only"}`
          );
        }
      } catch {
        if (mounted) {
          setChartData([]);
          setROI(null);
        }
      }
    };

    loadAnalysisData();

    return () => {
      mounted = false;
    };
  }, [activeZoneId]);

  const handleAnalyze = async (prompt?: string) => {
    if (!activeZoneId) return;
    const nextQuestion = prompt || question;
    setQuestion(nextQuestion);
    setLoading(true);
    setStatus("Running multi-step analysis...");

    try {
      const response = await queryAgent(nextQuestion, { zone: activeZoneId });
      setResult(response);
      setHistory((prev) => [response, ...prev].slice(0, 4));
      setStatus(response.assistantMessage || `${response.decision} | ${response.riskLevel} risk`);
    } catch (error) {
      setStatus("Analysis failed. Please try again.");
      console.error("Agent analysis failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const latest = chartData[chartData.length - 1];
  const irrigationLogs = result?.data?.irrigationLogs as IrrigationLogsResponse | undefined;
  const chartPoints = chartData.map((entry) => ({
    time: entry.timeOfDay || new Date(entry.timestamp || Date.now()).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    moisture: entry.soilMoisture,
    thresholdGap: entry.thresholdGap,
    stress: entry.waterStressIndex,
  }));

  return (
    <div className={`bg-white rounded-[24px] p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50 ${className}`}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3CC15A]" />
            <h3 className="font-extrabold text-gray-900 text-[16px]">AI Analysis Panel</h3>
          </div>
          <p className="text-[13px] text-gray-500 font-medium">
            Graph-aware analysis for {activeZone?.name || "the selected zone"}.
          </p>
        </div>
        <div className="bg-[#F3FBF5] border border-[#D7F0DD] rounded-2xl px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2F8F43]">
            Current Signal
          </div>
          <div className="text-[13px] font-semibold text-gray-900 mt-1">{status}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7 space-y-4">
          <div className="rounded-[20px] border border-gray-100 bg-[#FAFBFA] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-gray-900 text-[14px]">Moisture and stress trend</h4>
                <p className="text-[12px] text-gray-500">A simple visual summary of the selected zone</p>
              </div>
              {latest ? (
                <div className="text-right">
                  <div className="text-[11px] text-gray-400">Risk</div>
                  <div className="text-[13px] font-bold text-gray-900">{latest.riskLevel}</div>
                </div>
              ) : null}
            </div>

            <div className="h-[260px]">
              {chartPoints.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "14px",
                        border: "1px solid #E5E7EB",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="moisture"
                      name="Moisture"
                      stroke="#3CC15A"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="thresholdGap"
                      name="Threshold Gap"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="stress"
                      name="Stress Index"
                      stroke="#EF4444"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full rounded-[18px] border border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-[13px]">
                  No enriched data yet for this zone.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-[18px] bg-[#F6FBF7] border border-[#D9F3DE] p-4">
              <div className="text-[11px] font-bold text-[#2F8F43] uppercase tracking-[0.16em]">Moisture</div>
              <div className="text-[24px] font-extrabold text-gray-900 mt-1">
                {latest ? `${latest.soilMoisture}%` : "--"}
              </div>
              <div className="text-[12px] text-gray-500 mt-1">Current reading</div>
            </div>
            <div className="rounded-[18px] bg-[#FFF8E8] border border-[#F6E0B2] p-4">
              <div className="text-[11px] font-bold text-[#B7791F] uppercase tracking-[0.16em]">Gap</div>
              <div className="text-[24px] font-extrabold text-gray-900 mt-1">
                {latest ? latest.thresholdGap.toFixed(1) : "--"}
              </div>
              <div className="text-[12px] text-gray-500 mt-1">Below or above target</div>
            </div>
            <div className="rounded-[18px] bg-[#F9F5FF] border border-[#E8D7FF] p-4">
              <div className="text-[11px] font-bold text-[#7C3AED] uppercase tracking-[0.16em]">ROI</div>
              <div className="text-[24px] font-extrabold text-gray-900 mt-1">
                {roi ? `${(roi.roi * 100).toFixed(1)}%` : "--"}
              </div>
              <div className="text-[12px] text-gray-500 mt-1">
                {roi ? `${formatMoney(roi.costSaving)} savings` : "Awaiting ROI model"}
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 space-y-4">
          <div className="rounded-[20px] bg-[#0F172A] text-white p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              Ask the assistant
            </div>
            <h4 className="font-extrabold text-[18px] mt-2">Simple farm chat</h4>
            <p className="text-[13px] text-slate-300 mt-2 leading-relaxed">
              Ask about irrigation, logs, alerts, trends, ROI, or a specific date like 23rd. It replies in plain language.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {presetQuestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setQuestion(item);
                    handleAnalyze(item);
                  }}
                  className="text-left text-[11px] font-semibold px-3 py-2 rounded-full bg-white/10 hover:bg-white/15 transition border border-white/10"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-4">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={3}
                  className="w-full rounded-[16px] bg-white text-gray-900 placeholder:text-gray-400 border-0 p-3 text-[13px] focus:ring-2 focus:ring-emerald-300 outline-none resize-none"
                  placeholder="Ask about irrigation, logs, trends, or ROI..."
                />
              <button
                type="button"
                onClick={() => handleAnalyze()}
                disabled={loading || !activeZoneId}
                className="mt-3 w-full rounded-[14px] bg-[#3CC15A] text-white py-3 font-bold text-[14px] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Thinking..." : "Ask Assistant"}
              </button>
            </div>
          </div>

          {result ? (
            <div className="rounded-[20px] border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-900 text-[14px]">Answer</h4>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                  {result.mode || "decision"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-[14px] bg-gray-50 p-3">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.16em]">What it means</div>
                  <div className="text-[13px] font-bold text-gray-900 mt-1">{result.assistantMessage || result.decision}</div>
                </div>
                <div className="rounded-[14px] bg-gray-50 p-3">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.16em]">Signal</div>
                  <div className="text-[13px] font-bold text-gray-900 mt-1">{result.riskLevel}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.16em] mb-1">Details</div>
                  <p className="text-[13px] text-gray-700 leading-relaxed">{result.reason}</p>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.16em] mb-1">
                    Next step
                  </div>
                  <p className="text-[13px] font-semibold text-gray-900">{result.action}</p>
                </div>
                {irrigationLogs ? (
                  <div className="rounded-[16px] bg-[#F8FAFC] border border-gray-100 p-3">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.16em] mb-1">
                      Log Summary
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[12px] text-gray-700">
                      <div>Logs: <strong>{irrigationLogs.summary?.count ?? 0}</strong></div>
                      <div>Pump ON: <strong>{irrigationLogs.summary?.pumpOnCount ?? 0}</strong></div>
                      <div>High risk: <strong>{irrigationLogs.summary?.criticalCount ?? 0}</strong></div>
                      <div>Avg moisture: <strong>{irrigationLogs.summary?.avgMoisture ?? 0}%</strong></div>
                    </div>
                    {Array.isArray(irrigationLogs.logs) && irrigationLogs.logs.length > 0 ? (
                      <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                        {irrigationLogs.logs.slice(0, 5).map((log: any, index: number) => (
                          <div key={`${index}-${String(log?.timestamp || "")}`} className="rounded-[12px] bg-white border border-gray-100 p-2.5 text-[12px]">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-bold text-gray-900">
                                {log?.zone || activeZone?.name || "Zone"}
                              </div>
                              <div className="text-gray-400 text-[11px]">
                                {log?.timestamp ? new Date(log.timestamp).toLocaleString() : ""}
                              </div>
                            </div>
                            <div className="mt-1 text-gray-600">
                              Moisture {log?.soilMoisture ?? "--"}% | Temp {log?.temperature ?? "--"}°C | Pump {String(log?.pumpStatus || "--")}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {result.llmOutput?.summary ? (
                  <div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.16em] mb-1">
                      Model note
                    </div>
                    <p className="text-[13px] text-gray-700 leading-relaxed">
                      {String(result.llmOutput.summary)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="rounded-[20px] border border-gray-100 bg-[#FAFAFA] p-4">
            <h4 className="font-bold text-gray-900 text-[14px] mb-3">Recent Insights</h4>
            {history.length === 0 ? (
              <div className="text-[13px] text-gray-500">
                No agent response yet. Run an analysis to generate an explanation.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item, index) => (
                  <div key={`${item.question}-${index}`} className="rounded-[14px] bg-white border border-gray-100 p-3">
                    <div className="text-[11px] font-semibold text-gray-400 mb-1">{item.question}</div>
                    <div className="text-[13px] font-bold text-gray-900">{item.decision}</div>
                    <div className="text-[12px] text-gray-500 mt-1 line-clamp-2">{item.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
