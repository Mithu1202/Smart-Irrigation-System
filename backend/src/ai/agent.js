/**
 * agent.js
 * ─────────────────────────────────────────────────────────
 * AI Agent Orchestrator for the Smart Irrigation System.
 *
 * Architecture:
 *   1. Classify intent (agriculture guardrail)
 *   2. Gather evidence (tools run in parallel)
 *   3. Build local decision (rule engine)
 *   4. Synthesize via LLM (single call, token-efficient)
 *   5. Return structured response
 *
 * Key improvements over v1:
 *   - Agriculture-only guardrail (rejects off-topic queries)
 *   - Single LLM call instead of two
 *   - Token-efficient context (~2.5K tokens vs ~15K)
 *   - Conversation memory for follow-up questions
 *   - Expanded RAG knowledge base (52 entries)
 *   - Structured intent classification
 */

const { decideIrrigation, decideCropSuitability } = require("./decisionEngine");
const {
  getOpenRouterStatus,
  hasOpenRouter,
  synthesizeAgricultureResponse,
} = require("./openrouter");
const {
  classifyIntent,
  isGreeting,
  GREETING_RESPONSE,
  OFF_TOPIC_RESPONSE,
} = require("./prompts");
const {
  analyzeTrend,
  calculateROI,
  calculateRisk,
  computeThresholdGap,
  getIrrigationLogs,
  getRealtimeData,
  getZoneConfig,
  predictIrrigation,
  scrapeWebsite,
} = require("../tools");
const { searchKnowledge } = require("../rag/retriever");

// ── Zone Hint Extraction ─────────────────────────────────
const extractZoneHint = (question) => {
  const match = String(question || "").match(/\bzone\s*([a-z0-9]+)\b/i);
  if (match) return match[1].toUpperCase();

  const zoneLetter = String(question || "").match(/\b([abc])\b/i);
  if (zoneLetter) return zoneLetter[1].toUpperCase();

  return null;
};

// ── Date Extraction ──────────────────────────────────────
const parseQuestionDate = (question) => {
  const text = String(question || "").toLowerCase();

  if (text.includes("today")) return new Date();
  if (text.includes("yesterday")) {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date;
  }

  const explicit = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (explicit) return new Date(explicit[1]);

  const ordinal = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (ordinal) {
    const date = new Date();
    date.setDate(Number(ordinal[1]));
    return date;
  }

  return null;
};

// ── Evidence Builder (for local fallback) ────────────────
const buildEvidenceItems = ({ zone, data, trend, retrieval, irrigationLogs, roi }) => {
  const items = [];

  if (zone) {
    items.push(
      `Zone ${zone.name || zone.zoneId || "selected"}: threshold ${zone.moistureThreshold ?? "--"}%`
    );
  }
  if (data?.soilMoisture !== undefined) {
    items.push(`Live soil moisture: ${Number(data.soilMoisture)}%`);
  }
  if (data?.temperature !== undefined) {
    items.push(`Temperature: ${Number(data.temperature)}°C`);
  }
  if (data?.humidity !== undefined) {
    items.push(`Humidity: ${Number(data.humidity)}%`);
  }
  if (trend?.trendDirection) {
    items.push(`Trend: ${trend.trendDirection} (rate: ${trend.moistureTrend ?? 0})`);
  }
  if (Array.isArray(retrieval?.results)) {
    retrieval.results.slice(0, 3).forEach((item, i) => {
      const src = item.source || {};
      const label = src.crop || src.name || `Ref ${i + 1}`;
      const snippet = String(src.recommendation || src.description || item.text || "").slice(0, 100);
      items.push(`${label}: ${snippet}`);
    });
  }
  if (irrigationLogs?.summary) {
    items.push(
      `Logs: ${irrigationLogs.summary.count} entries, ${irrigationLogs.summary.pumpOnCount} pump-on`
    );
  }
  if (roi) {
    items.push(`ROI: ${Math.round((roi.roi || 0) * 100) / 100}`);
  }

  return items.slice(0, 8);
};

// ── Local Fallback Builder ───────────────────────────────
// Used when LLM is unavailable or fails
const buildLocalFallback = ({
  question,
  intent,
  zone,
  data,
  trend,
  retrieval,
  irrigationLogs,
  roi,
  irrigationDecision,
  cropDecision,
}) => {
  const evidence = buildEvidenceItems({ zone, data, trend, retrieval, irrigationLogs, roi });
  const zoneName = zone?.name || zone?.zoneId || "the selected zone";
  const nextSteps = [];

  let answer, decision, reason, action, confidence, riskLevel;

  switch (intent) {
    case "crop_suitability": {
      const best = cropDecision?.recommendedCrops?.[0];
      answer = best
        ? `${best.crop} is the best match for ${zoneName} based on current conditions (score: ${best.matchScore}).`
        : `No strong crop match found for ${zoneName}.`;
      decision = cropDecision?.decision || "Crop analysis complete";
      reason = cropDecision?.reason || "Based on RAG knowledge base and zone conditions";
      action = cropDecision?.action || "Review crop recommendations";
      confidence = cropDecision?.confidence || 0.7;
      riskLevel = cropDecision?.riskLevel || "LOW";
      nextSteps.push("Compare recommended crops with zone threshold");
      nextSteps.push("Check seasonal planting calendar");
      break;
    }
    case "logs": {
      const count = irrigationLogs?.summary?.count ?? 0;
      answer = `Found ${count} irrigation log entries for ${zoneName}.`;
      decision = "Log summary ready";
      reason = `Checked MongoDB records for ${zoneName}`;
      action = "Review pump activity and risk events";
      confidence = 0.85;
      riskLevel = "LOW";
      nextSteps.push("Compare pump-on events with moisture readings");
      nextSteps.push("Check for high-risk log entries");
      break;
    }
    case "trend": {
      const dir = trend?.trendDirection || "stable";
      answer = `Moisture trend for ${zoneName} is ${dir} (rate: ${trend?.moistureTrend ?? 0}).`;
      decision = "Trend analysis ready";
      reason = `Analyzed last 24 MongoDB readings for ${zoneName}`;
      action = "Use the trend to time your next irrigation";
      confidence = 0.8;
      riskLevel = irrigationDecision?.riskLevel || "LOW";
      nextSteps.push("Monitor the next sensor update");
      nextSteps.push("Compare trend against threshold gap");
      break;
    }
    case "irrigation": {
      const needed = irrigationDecision?.irrigationNeeded;
      answer = needed
        ? `${zoneName} needs irrigation. Moisture is ${data?.soilMoisture ?? "--"}% (threshold: ${zone?.moistureThreshold ?? "--"}%) and the trend is ${trend?.trendDirection || "stable"}.`
        : `${zoneName} is within safe moisture range (${data?.soilMoisture ?? "--"}%).`;
      decision = irrigationDecision?.decision || "Irrigation assessment complete";
      reason = irrigationDecision?.reason || "Based on threshold comparison and trend analysis";
      action = irrigationDecision?.action || "Continue monitoring";
      confidence = irrigationDecision?.confidence || 0.75;
      riskLevel = irrigationDecision?.riskLevel || "LOW";
      nextSteps.push("Check moisture again in 1 hour");
      nextSteps.push("Review pump control settings");
      break;
    }
    default: {
      answer = `Checked ${zoneName}: moisture ${data?.soilMoisture ?? "--"}%, temp ${data?.temperature ?? "--"}°C, humidity ${data?.humidity ?? "--"}%.`;
      decision = irrigationDecision?.decision || "Data review complete";
      reason = "Combined sensor telemetry, RAG search, and zone context";
      action = "Review the evidence and monitor the farm";
      confidence = 0.7;
      riskLevel = irrigationDecision?.riskLevel || "LOW";
      nextSteps.push("Ask about crops, irrigation, or trends");
      nextSteps.push("Check a specific zone for recommendations");
    }
  }

  return {
    answer,
    decision,
    reason,
    action,
    confidence,
    riskLevel,
    evidence,
    nextSteps,
    recommendedCrops: cropDecision?.recommendedCrops,
    cropEvidence: cropDecision?.cropEvidence,
  };
};

// ── Main Agent Entry Point ───────────────────────────────
const runAgentQuery = async (question, options = {}) => {
  const trimmedQuestion = String(question || "").trim();

  // ── Step 1: Greeting check ──────────────────────────
  if (isGreeting(trimmedQuestion)) {
    return {
      question: trimmedQuestion,
      ...GREETING_RESPONSE,
      assistantMessage: GREETING_RESPONSE.answer,
      mode: "greeting",
      openRouter: getOpenRouterStatus(),
      llmOutput: null,
      data: {},
      retrieval: null,
      toolTrace: [],
    };
  }

  // ── Step 2: Intent classification & guardrail ───────
  const intent = classifyIntent(trimmedQuestion);

  if (intent === "off_topic") {
    return {
      question: trimmedQuestion,
      ...OFF_TOPIC_RESPONSE,
      assistantMessage: OFF_TOPIC_RESPONSE.answer,
      mode: "off_topic",
      openRouter: getOpenRouterStatus(),
      llmOutput: null,
      data: {},
      retrieval: null,
      toolTrace: [],
    };
  }

  // ── Step 3: Extract parameters ──────────────────────
  const zoneHint = options.zone || extractZoneHint(trimmedQuestion);
  const requestedDate = parseQuestionDate(trimmedQuestion);
  const needsLogs = intent === "logs";
  const needsROI = intent === "roi";
  const needsCrop = intent === "crop_suitability";

  // ── Step 4: Gather evidence (parallel) ──────────────
  const [realtime, zoneConfig, trend, retrieval] = await Promise.all([
    getRealtimeData(zoneHint),
    getZoneConfig(zoneHint),
    analyzeTrend(zoneHint),
    searchKnowledge(trimmedQuestion, { limit: 5 }),
  ]);

  const data = trend?.latest || realtime.latest || {};
  const zone =
    zoneConfig ||
    realtime.zone?.toObject?.() ||
    realtime.zone ||
    trend.zone?.toObject?.() ||
    trend.zone ||
    null;

  // ── Step 5: Compute analytics (parallel) ────────────
  const [thresholdGap, risk, prediction, roi, irrigationLogs] = await Promise.all([
    computeThresholdGap({ data, zone }),
    calculateRisk({ data, zone, trend }),
    predictIrrigation({ data, zone, trend }),
    needsROI
      ? calculateROI({
          zoneInput: zoneHint,
          systemCost: options.systemCost,
          costPerLiter: options.costPerLiter,
          litersPerReading: options.litersPerReading,
        })
      : Promise.resolve(null),
    needsLogs
      ? getIrrigationLogs({
          zoneInput: zoneHint,
          dateInput: requestedDate || undefined,
          limit: options.limit || 20,
        })
      : Promise.resolve(null),
  ]);

  // ── Step 6: Rule-based decisions ────────────────────
  const irrigationDecision = decideIrrigation({
    data,
    zone,
    trend,
    roi,
    retrieval,
  });

  const cropDecision = needsCrop
    ? decideCropSuitability({ data, zone, trend, retrieval })
    : null;

  const localDecision = cropDecision || irrigationDecision;

  // ── Step 7: Build local fallback ────────────────────
  const localFallback = buildLocalFallback({
    question: trimmedQuestion,
    intent,
    zone,
    data,
    trend,
    retrieval,
    irrigationLogs,
    roi,
    irrigationDecision,
    cropDecision,
  });

  // ── Step 8: Tool trace (lightweight) ────────────────
  const toolTrace = [
    { tool: "getRealtimeData", status: realtime.latest ? "ok" : "empty" },
    { tool: "getZoneConfig", status: zone ? "ok" : "empty" },
    { tool: "analyzeTrend", status: trend?.trendDirection ? "ok" : "empty" },
    { tool: "computeThresholdGap", status: "ok" },
    { tool: "calculateRisk", status: risk?.riskLevel || "unknown" },
    { tool: "predictIrrigation", status: prediction?.irrigationNeeded ? "needed" : "hold" },
    { tool: "ragRetriever", status: `${retrieval?.results?.length || 0} matches` },
    ...(roi ? [{ tool: "calculateROI", status: "ok" }] : []),
    ...(irrigationLogs ? [{ tool: "getIrrigationLogs", status: `${irrigationLogs.summary?.count || 0} entries` }] : []),
  ];

  // ── Step 9: LLM synthesis (single call) ─────────────
  let llmOutput = null;

  if (hasOpenRouter()) {
    llmOutput = await synthesizeAgricultureResponse({
      question: trimmedQuestion,
      intent,
      zone,
      data,
      trend,
      thresholdGap,
      risk,
      prediction,
      roi,
      irrigationLogs,
      decision: localDecision,
      retrieval,
      sessionId: options.sessionId,
    });
  }

  // ── Step 10: Merge LLM + local fallback ─────────────
  const finalAnswer = llmOutput?.answer || localFallback.answer;
  const finalDecision = llmOutput?.decision || localFallback.decision;
  const finalReason = llmOutput?.reason || localFallback.reason;
  const finalAction = llmOutput?.action || localFallback.action;
  const finalConfidence = llmOutput?.confidence ?? localFallback.confidence;
  const finalRisk = llmOutput?.riskLevel || localFallback.riskLevel;
  const finalEvidence = llmOutput?.evidence?.length
    ? llmOutput.evidence
    : localFallback.evidence;
  const finalNextSteps = llmOutput?.nextSteps?.length
    ? llmOutput.nextSteps
    : localFallback.nextSteps;

  // ── Step 11: Return structured response ─────────────
  return {
    question: trimmedQuestion,
    decision: finalDecision,
    reason: finalReason,
    action: finalAction,
    confidence: finalConfidence,
    riskLevel: finalRisk,
    answer: finalAnswer,
    assistantMessage: finalAnswer,
    mode: intent,
    openRouter: getOpenRouterStatus(),
    llmOutput,
    data: {
      zone,
      realtime: data,
      trend,
      thresholdGap,
      risk,
      prediction,
      roi,
      irrigationLogs,
      cropEvidence: cropDecision?.cropEvidence || localDecision.cropEvidence,
      recommendedCrops: cropDecision?.recommendedCrops || localDecision.recommendedCrops,
      evidence: finalEvidence,
      nextSteps: finalNextSteps,
    },
    retrieval,
    toolTrace,
  };
};

module.exports = {
  runAgentQuery,
};
