/**
 * tokenBudget.js
 * ─────────────────────────────────────────────────────────
 * Token estimation and context compression utilities.
 * Prevents bloated LLM payloads by enforcing a strict
 * token budget for the context window.
 *
 * Strategy: instead of dumping the full toolTrace JSON
 * (~15K tokens), we build a compact context summary
 * (~500-800 tokens) that captures only the decision-relevant
 * information.
 */

// ── Rough Token Estimation ───────────────────────────────
// ~4 chars per token for English text, ~3 chars for JSON
const estimateTokens = (text) => {
  if (!text) return 0;
  const str = typeof text === "string" ? text : JSON.stringify(text);
  return Math.ceil(str.length / 3.5);
};

// ── Token Budget Constants ───────────────────────────────
const TOKEN_BUDGET = {
  systemPrompt: 800,     // System prompt + few-shot examples
  contextSummary: 600,   // Compressed sensor/zone/trend data
  ragContext: 400,       // RAG retrieval results
  conversationHistory: 500, // Sliding window of past messages
  userQuestion: 200,     // Current user question
  // Total input budget: ~2500 tokens
  // Output budget: ~500 tokens
  // Grand total: ~3000 tokens per request
  maxInput: 3000,
  maxOutput: 800,
};

// ── Conversation Memory ──────────────────────────────────
// Simple sliding window of recent exchanges
const MAX_MEMORY_ENTRIES = 5;
const conversationMemory = new Map(); // sessionId -> messages[]

const getMemory = (sessionId) => {
  return conversationMemory.get(sessionId || "default") || [];
};

const addToMemory = (sessionId, userMessage, assistantMessage) => {
  const key = sessionId || "default";
  const memory = conversationMemory.get(key) || [];

  memory.push(
    { role: "user", content: truncate(userMessage, 150) },
    { role: "assistant", content: truncate(assistantMessage, 200) }
  );

  // Keep only the last N exchanges
  while (memory.length > MAX_MEMORY_ENTRIES * 2) {
    memory.shift();
  }

  conversationMemory.set(key, memory);
};

const clearMemory = (sessionId) => {
  conversationMemory.delete(sessionId || "default");
};

// ── String Truncation ────────────────────────────────────
const truncate = (text, maxLength) => {
  const str = String(text || "");
  return str.length > maxLength ? str.slice(0, maxLength) + "..." : str;
};

// ── Compact Context Builder ──────────────────────────────
// Compresses all tool outputs into a decision-relevant summary
const buildCompactContext = ({
  question,
  intent,
  zone,
  data,
  trend,
  thresholdGap,
  risk,
  prediction,
  roi,
  irrigationLogs,
  decision,
  retrieval,
}) => {
  const lines = [];

  // Zone info (compact)
  if (zone) {
    lines.push(
      `ZONE: ${zone.name || zone.zoneId || "Unknown"} | Threshold: ${zone.moistureThreshold ?? "--"}% | Crop: ${zone.cropType || "Not set"}`
    );
  }

  // Current sensor readings (compact)
  const moisture = safeNum(data?.soilMoisture);
  const temp = safeNum(data?.temperature);
  const hum = safeNum(data?.humidity);
  const rain = safeNum(data?.rainfall);

  if (moisture || temp || hum) {
    lines.push(
      `SENSORS: Moisture=${moisture}% | Temp=${temp}°C | Humidity=${hum}% | Rainfall=${rain}mm`
    );
  } else {
    lines.push("SENSORS: No live telemetry available");
  }

  // Threshold gap and trend (compact)
  if (typeof thresholdGap === "object" && thresholdGap !== null) {
    lines.push(`GAP: ${thresholdGap.gap ?? "--"} (${thresholdGap.gap < 0 ? "BELOW" : "ABOVE"} threshold)`);
  } else if (typeof thresholdGap === "number") {
    lines.push(`GAP: ${thresholdGap} (${thresholdGap < 0 ? "BELOW" : "ABOVE"} threshold)`);
  }

  if (trend) {
    lines.push(
      `TREND: ${trend.trendDirection || "stable"} | Rate=${safeNum(trend.moistureTrend)} | Avg=${safeNum(trend.averageMoisture)}%`
    );
  }

  // Risk assessment (compact)
  if (risk) {
    lines.push(`RISK: ${risk.riskLevel || "UNKNOWN"} (score: ${risk.riskScore ?? "--"})`);
  }

  // ML prediction (compact)
  if (prediction) {
    lines.push(
      `ML_PREDICTION: ${prediction.irrigationNeeded ? "Irrigation needed" : "Hold"} | Confidence: ${prediction.confidence ?? "--"}`
    );
  }

  // Decision engine result (compact)
  if (decision) {
    lines.push(`DECISION_ENGINE: ${decision.decision || "--"} | Confidence: ${decision.confidence ?? "--"}`);
  }

  // ROI (compact, only if requested)
  if (roi) {
    lines.push(`ROI: ${JSON.stringify(roi).slice(0, 120)}`);
  }

  // Irrigation logs summary (compact, only if requested)
  if (irrigationLogs?.summary) {
    const s = irrigationLogs.summary;
    lines.push(
      `LOGS: ${s.count} entries | ${s.pumpOnCount} pump-on | ${s.criticalCount} critical | Avg moisture: ${s.avgMoisture}%`
    );
  }

  return lines.join("\n");
};

// ── Compact RAG Context ──────────────────────────────────
const buildRAGContext = (retrieval, maxResults = 3) => {
  if (!retrieval?.results?.length) return "RAG: No knowledge base matches found.";

  const matches = retrieval.results.slice(0, maxResults).map((item, i) => {
    const src = item.source || {};
    const crop = src.crop || src.name || `Match ${i + 1}`;
    const category = src.category || "general";
    const score = item.score ?? 0;
    const rec = truncate(src.recommendation || src.description || item.text || "", 120);
    return `  ${i + 1}. ${crop} [${category}] (score: ${score}): ${rec}`;
  });

  return `RAG MATCHES:\n${matches.join("\n")}`;
};

// ── Build Final LLM Messages ─────────────────────────────
const buildLLMMessages = ({
  systemPrompt,
  fewShotExamples,
  conversationHistory,
  question,
  compactContext,
  ragContext,
}) => {
  const messages = [{ role: "system", content: systemPrompt }];

  // Add few-shot examples (already pre-formatted)
  if (fewShotExamples?.length) {
    messages.push(...fewShotExamples);
  }

  // Add conversation history (sliding window)
  if (conversationHistory?.length) {
    messages.push(...conversationHistory);
  }

  // Build the user message with context
  const userContent = [
    `QUESTION: ${question}`,
    "",
    "── LIVE SYSTEM DATA ──",
    compactContext,
    "",
    "── KNOWLEDGE BASE ──",
    ragContext,
    "",
    "Analyze the above data and answer the question. Return valid JSON only.",
  ].join("\n");

  messages.push({ role: "user", content: userContent });

  // Log token estimate
  const totalTokens = estimateTokens(messages);
  if (totalTokens > TOKEN_BUDGET.maxInput) {
    console.warn(
      `[TokenBudget] Input exceeds budget: ${totalTokens} > ${TOKEN_BUDGET.maxInput}. Trimming conversation history.`
    );
    // Remove oldest conversation entries to fit budget
    const historyStart = messages.findIndex(
      (m, i) => i > 1 + (fewShotExamples?.length || 0) && m.role === "user"
    );
    if (historyStart > 0 && historyStart < messages.length - 1) {
      messages.splice(historyStart, 2); // Remove one Q/A pair
    }
  }

  return messages;
};

// ── Helpers ──────────────────────────────────────────────
const safeNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

module.exports = {
  estimateTokens,
  TOKEN_BUDGET,
  buildCompactContext,
  buildRAGContext,
  buildLLMMessages,
  getMemory,
  addToMemory,
  clearMemory,
  truncate,
};
