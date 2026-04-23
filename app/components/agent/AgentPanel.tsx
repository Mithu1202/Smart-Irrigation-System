"use client";

import { useState } from "react";
import SuggestedActions from "./SuggestedActions";
import AgentInput from "./AgentInput";
import AgentResponseCard from "./AgentResponseCard";
import { queryAgent, type AgentQueryResponse } from "../../../lib/api";

type Props = {
  zone?: string;
  compact?: boolean;
};

export default function AgentPanel({ zone, compact = false }: Props) {
  const [response, setResponse] = useState<AgentQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleQuery = async (query: string) => {
    setLoading(true);
    try {
      const data = await queryAgent(query, { zone });
      setResponse(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-[24px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] transition-colors ${compact ? "h-full" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-[14px] bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-gray-900 dark:text-gray-100">AI Agriculture Assistant</h2>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">Ask about crops, irrigation, logs, alerts, trends, or ROI.</p>
            </div>
          </div>
        </div>
        <span className="rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
          BETA
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-3 text-[13px] font-semibold text-gray-700 dark:text-gray-300">Suggested Actions</div>
        <SuggestedActions onSelect={handleQuery} />
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[13px] font-medium text-gray-500 dark:text-gray-400">Ask anything about your farm...</div>
        <AgentInput
          onSubmit={handleQuery}
          placeholder="Type your question here..."
          buttonLabel="Ask"
        />
      </div>

      {loading ? (
        <div className="mt-4 rounded-[18px] border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4 text-[13px] text-gray-500 dark:text-gray-400">
          Thinking...
        </div>
      ) : null}

      {response ? <AgentResponseCard data={response} /> : null}
    </div>
  );
}
