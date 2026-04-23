import type { AgentQueryResponse } from "../../../lib/api";

type Props = {
  data: AgentQueryResponse;
};

const safeNumber = (value: unknown, fallback = "--") =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export default function AgentResponseCard({ data }: Props) {
  const irrigationLogs = data.data?.irrigationLogs as
    | {
        summary?: {
          count?: number;
          pumpOnCount?: number;
          criticalCount?: number;
          avgMoisture?: number;
          avgTemperature?: number;
        };
        logs?: Array<Record<string, unknown>>;
      }
    | undefined;

  const cropEvidence = data.data?.cropEvidence as
    | {
        current?: {
          soilMoisture?: number;
          temperature?: number;
          humidity?: number;
          rainfall?: number;
        };
        threshold?: number;
        zone?: string | null;
        trendDirection?: string;
        liveTelemetry?: boolean;
      }
    | undefined;

  const recommendedCrops = data.data?.recommendedCrops as
    | Array<{
        crop?: string;
        matchScore?: number;
        recommendation?: string;
        evidence?: string;
        sourceId?: string | number;
      }>
    | undefined;

  const evidenceItems = (data.data?.evidence as string[] | undefined) || [];
  const nextSteps = (data.data?.nextSteps as string[] | undefined) || [];

  const latest = data.data?.realtime as
    | {
        soilMoisture?: number;
        temperature?: number;
        humidity?: number;
        pumpStatus?: string;
      }
    | undefined;

  return (
    <div className="mt-4 rounded-[22px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-[0_2px_14px_-6px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_14px_-6px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
            Agriculture Insight
          </div>
          <h3 className="mt-1 text-[18px] font-bold text-gray-900 dark:text-gray-100">{data.decision}</h3>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
          {data.mode || "decision"}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="text-[12px] font-semibold text-gray-500">Answer</div>
          <p className="mt-1 text-[13px] leading-relaxed text-gray-700 dark:text-gray-300">
            {data.answer || data.assistantMessage || data.reason}
          </p>
        </div>

        <div>
          <div className="text-[12px] font-semibold text-gray-500">Why</div>
          <p className="mt-1 text-[13px] leading-relaxed text-gray-700 dark:text-gray-300">
            {data.assistantMessage || data.reason}
          </p>
        </div>

        <div>
          <div className="text-[12px] font-semibold text-gray-500">Action</div>
          <p className="mt-1 text-[13px] font-semibold text-gray-900 dark:text-gray-100">{data.action}</p>
        </div>

        {recommendedCrops && recommendedCrops.length > 0 ? (
          <div>
            <div className="text-[12px] font-semibold text-gray-500">Top crop matches</div>
            <div className="mt-2 space-y-2">
              {recommendedCrops.slice(0, 3).map((crop, index) => (
                <div
                  key={`${crop.crop}-${index}`}
                  className="rounded-[16px] border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-bold text-gray-900">{crop.crop || "Unknown crop"}</div>
                    <div className="flex items-center gap-2">
                      {crop.sourceId ? (
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                          CSV #{crop.sourceId}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        {typeof crop.matchScore === "number"
                          ? `${crop.matchScore.toFixed(1)} match`
                          : "match"}
                      </span>
                    </div>
                  </div>
                  {crop.recommendation ? (
                    <p className="mt-1 text-[12px] text-gray-600">{crop.recommendation}</p>
                  ) : null}
                  {crop.evidence ? (
                    <p className="mt-1 text-[11px] text-gray-400 line-clamp-2">
                      Evidence: {crop.evidence}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {evidenceItems.length > 0 ? (
          <div>
            <div className="text-[12px] font-semibold text-gray-500">Evidence</div>
            <div className="mt-2 space-y-2">
              {evidenceItems.slice(0, 5).map((item, index) => (
                <div
                  key={`${index}-${item}`}
                  className="rounded-[14px] border border-gray-200 bg-gray-50 p-3"
                >
                  <p className="text-[12px] text-gray-700 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <div className="text-[12px] font-semibold text-gray-500">Data Used</div>
          <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-[14px] border border-gray-200 bg-gray-50 p-3">
              <div className="text-[11px] text-gray-400">Moisture</div>
              <div className="mt-1 text-[16px] font-bold text-gray-900">
                {safeNumber(latest?.soilMoisture)}
              </div>
            </div>
            <div className="rounded-[14px] border border-gray-200 bg-gray-50 p-3">
              <div className="text-[11px] text-gray-400">Threshold</div>
              <div className="mt-1 text-[16px] font-bold text-gray-900">
                {safeNumber(
                  (data.data?.zone as { moistureThreshold?: number } | null)?.moistureThreshold
                )}
              </div>
            </div>
            <div className="rounded-[14px] border border-gray-200 bg-gray-50 p-3">
              <div className="text-[11px] text-gray-400">Trend</div>
              <div className="mt-1 text-[16px] font-bold text-gray-900">
                {String(
                  (data.data?.trend as { trendDirection?: string } | null)?.trendDirection ||
                    "Stable"
                )}
              </div>
            </div>
            <div className="rounded-[14px] border border-gray-200 bg-gray-50 p-3">
              <div className="text-[11px] text-gray-400">Temp</div>
              <div className="mt-1 text-[16px] font-bold text-gray-900">
                {safeNumber(latest?.temperature)}°C
              </div>
            </div>
          </div>
        </div>

        {cropEvidence ? (
          <div className="rounded-[16px] border border-sky-100 bg-sky-50/60 p-3">
            <div className="text-[12px] font-semibold text-sky-800">Evidence</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-gray-700">
              <div>
                Zone: <strong>{cropEvidence.zone || "selected zone"}</strong>
              </div>
              <div>
                Threshold: <strong>{cropEvidence.threshold ?? "--"}</strong>
              </div>
              <div>
                Trend: <strong>{cropEvidence.trendDirection || "stable"}</strong>
              </div>
              <div>
                Moisture: <strong>{cropEvidence.current?.soilMoisture ?? "--"}%</strong>
              </div>
            </div>
            <div className="mt-2 text-[11px] font-medium text-sky-700">
              {cropEvidence.liveTelemetry
                ? "Evidence uses live Mongo telemetry plus the CSV knowledge base."
                : "Live telemetry was unavailable, so this answer is based on the CSV knowledge base."}
            </div>
          </div>
        ) : null}

        {nextSteps.length > 0 ? (
          <div>
            <div className="text-[12px] font-semibold text-gray-500">Next steps</div>
            <div className="mt-2 space-y-2">
              {nextSteps.slice(0, 4).map((step, index) => (
                <div
                  key={`${index}-${step}`}
                  className="rounded-[14px] border border-gray-200 bg-white p-3"
                >
                  <p className="text-[12px] text-gray-700">{step}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {irrigationLogs ? (
          <div className="rounded-[16px] border border-emerald-100 bg-emerald-50/50 p-3">
            <div className="text-[12px] font-semibold text-emerald-800">Log Summary</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-gray-700">
              <div>
                Logs: <strong>{irrigationLogs.summary?.count ?? 0}</strong>
              </div>
              <div>
                Pump ON: <strong>{irrigationLogs.summary?.pumpOnCount ?? 0}</strong>
              </div>
              <div>
                High risk: <strong>{irrigationLogs.summary?.criticalCount ?? 0}</strong>
              </div>
              <div>
                Avg moisture: <strong>{irrigationLogs.summary?.avgMoisture ?? 0}%</strong>
              </div>
            </div>
          </div>
        ) : null}

        {data.llmOutput?.summary ? (
          <div className="rounded-[16px] border border-gray-200 bg-gray-50 p-3">
            <div className="text-[12px] font-semibold text-gray-500">Model note</div>
            <p className="mt-1 text-[13px] text-gray-700">{String(data.llmOutput.summary)}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
