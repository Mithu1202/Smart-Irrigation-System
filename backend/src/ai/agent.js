const { decideIrrigation, decideCropSuitability } = require("./decisionEngine");
const {
  getOpenRouterStatus,
  synthesizeAgentJSON,
  synthesizeAgricultureJSON,
} = require("./openrouter");
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

const extractZoneHint = (question) => {
  const match = String(question || "").match(/\bzone\s*([a-z0-9]+)\b/i);
  if (match) return match[1].toUpperCase();

  const zoneLetter = String(question || "").match(/\b([abc])\b/i);
  if (zoneLetter) return zoneLetter[1].toUpperCase();

  return null;
};

const shouldCalculateROI = (question) =>
  /roi|return on investment|savings|water saved/i.test(String(question || ""));

const isAgricultureGeneralQuestion = (question) =>
  /graph|chart|data|analyze|analyse|trend|soil|moisture|water|irrigat|crop|plant|field|farm|agricultur|rain|temperature|humidity|alert|risk|fertilizer|seed|pest|disease|harvest|yield|manure/i.test(
    String(question || "")
  );

const isCropSuitabilityQuestion = (question) =>
  /which plant|what plant|suitable crop|suitable plant|best crop|recommend crop|what should i plant|plant suitability|crop suitability|suitab|suitbale|fit for|good for|can i grow|is .* suitable|is .* suitab|tomato|rice|maize|chili|pepper|lettuce|spinach|corn/i.test(
    String(question || "")
  );

const isLogQuestion = (question) =>
  /log|logs|history|record|records|archive/i.test(
    String(question || "")
  );

const isFarmQuestion = (question) =>
  /graph|chart|data|analyze|analyse|irrigat|water|soil|moisture|pump|zone|crop|field|farm|agricultur|rain|temperature|humidity|alert|trend|risk|roi|log|history|record|plant|fertilizer|seed|pest|disease|harvest|yield|manure/i.test(
    String(question || "")
  );

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

const buildToolTrace = (name, value) => ({
  tool: name,
  output: value,
});

const buildEvidenceItems = ({
  question,
  zone,
  data,
  trend,
  retrieval,
  irrigationLogs,
  roi,
  websiteContext,
}) => {
  const items = [];

  if (zone) {
    items.push(`Zone ${zone.name || zone.zoneId || "selected"} threshold: ${zone.moistureThreshold ?? "--"}`);
  }

  if (data && typeof data.soilMoisture !== "undefined") {
    items.push(`Live soil moisture: ${Number(data.soilMoisture)}%`);
  }

  if (data && typeof data.temperature !== "undefined") {
    items.push(`Temperature: ${Number(data.temperature)}°C`);
  }

  if (data && typeof data.humidity !== "undefined") {
    items.push(`Humidity: ${Number(data.humidity)}%`);
  }

  if (trend?.trendDirection) {
    items.push(`Trend direction: ${trend.trendDirection}`);
  }

  if (Array.isArray(retrieval?.results)) {
    retrieval.results.slice(0, 3).forEach((item, index) => {
      const source = item.source || {};
      const label = source.crop || source.name || source.title || `Reference ${index + 1}`;
      const snippet = source.recommendation || source.description || item.text || "";
      items.push(`${label}: ${String(snippet).slice(0, 140)}`);
    });
  }

  if (irrigationLogs?.summary) {
    items.push(
      `Logs: ${irrigationLogs.summary.count} entries, ${irrigationLogs.summary.pumpOnCount} pump-on, ${irrigationLogs.summary.criticalCount} high-risk`
    );
  }

  if (roi) {
    items.push(`ROI: ${Math.round((roi.roi || 0) * 100) / 100}`);
  }

  if (websiteContext?.configured && websiteContext.excerpt) {
    items.push(`Web source: ${String(websiteContext.excerpt).slice(0, 140)}`);
  }

  return items.slice(0, 8);
};

const buildGeneralAgricultureFallback = ({
  question,
  zone,
  data,
  trend,
  retrieval,
  irrigationLogs,
  roi,
  websiteContext,
  cropDecision,
  irrigationDecision,
}) => {
  const topCrop = cropDecision?.recommendedCrops?.[0] || null;
  const evidence = buildEvidenceItems({
    question,
    zone,
    data,
    trend,
    retrieval,
    irrigationLogs,
    roi,
    websiteContext,
  });
  const q = String(question || "").toLowerCase();
  const zoneName = zone?.name || zone?.zoneId || "the selected zone";

  let answer = `I checked the live zone data and the knowledge base for ${zoneName}.`;
  let action = "Review the evidence and continue monitoring the farm.";
  let reason = "The system combined MongoDB telemetry, RAG search, and zone context.";
  let decision = "Agriculture insight ready";
  let confidence = 0.78;
  let riskLevel = irrigationDecision?.riskLevel || "LOW";
  let summary = "A farm insight was generated from the available data sources.";
  const nextSteps = [];

  if (isCropSuitabilityQuestion(q)) {
    decision = cropDecision?.decision || "Crop suitability available";
    reason = cropDecision?.reason || reason;
    action = cropDecision?.action || action;
    confidence = cropDecision?.confidence || confidence;
    riskLevel = cropDecision?.riskLevel || riskLevel;
    summary = cropDecision?.decision || summary;
    const cropName = topCrop?.crop || cropDecision?.recommendedCrops?.[0]?.crop || "the best matching crop";
    answer = `${cropName} looks like the strongest match for ${zoneName} based on the current crop knowledge and zone conditions.`;
    nextSteps.push(`Compare ${cropName} with the zone threshold before planting`);
    nextSteps.push("Use the recommended crop card as the evidence summary");
  } else if (/log|history|record/.test(q)) {
    const count = irrigationLogs?.summary?.count ?? 0;
    answer = `I found ${count} irrigation log entries for ${zoneName}.`;
    decision = "Log summary ready";
    reason = `The log history for ${zoneName} was checked using MongoDB records.`;
    action = "Review the latest log entries and pump activity.";
    summary = `Log history from MongoDB is available for ${zoneName}.`;
    nextSteps.push("Open the log list and compare pump-on events");
    nextSteps.push("Check the date-specific summary if needed");
  } else if (/yield|harvest/.test(q)) {
    answer = `For yield and harvest questions, the strongest signal currently comes from the moisture trend (${trend?.trendDirection || "stable"}) and the crop references in the knowledge base.`;
    decision = "Yield and harvest context ready";
    reason = "Yield and harvest guidance is being inferred from crop suitability, moisture trend, and zone conditions.";
    action = "Use the current crop match and moisture trend to guide the next farming step.";
    summary = "Yield/harvest guidance is based on available zone evidence and crop references.";
    nextSteps.push("Keep moisture near threshold to reduce stress");
    nextSteps.push("Use the crop match card for planting guidance");
  } else if (/trend|status|current|how is|today|now/.test(q)) {
    const trendDirection = trend?.trendDirection || "stable";
    const moistureTrend = Number(trend?.moistureTrend ?? 0);
    answer = `The soil moisture trend for ${zoneName} is currently ${trendDirection}${moistureTrend ? ` (${moistureTrend})` : ""}.`;
    decision = "Trend summary ready";
    reason = `The trend was read from the latest MongoDB readings and the enriched analytics layer.`;
    action = "Use the trend with the current threshold to decide irrigation timing.";
    summary = `Moisture trend for ${zoneName} is ${trendDirection}.`;
    nextSteps.push("Watch the next sensor update for confirmation");
    nextSteps.push("Compare the trend against the threshold gap");
  } else if (/fertilizer|manure|seed|pest|disease/.test(q)) {
    answer = `I do not have a dedicated pest or fertilizer dataset, but the current zone data and crop knowledge base suggest ${topCrop?.crop || "the closest crop match"} as the most relevant reference.`;
    decision = "Agriculture guidance ready";
    reason = "The assistant used the live zone readings and the closest CSV crop references to answer the question.";
    action = "Use the crop recommendation and live soil readings before making a treatment decision.";
    summary = "Treatment guidance is based on the available agriculture evidence.";
    nextSteps.push("Verify the zone readings before applying treatment");
    nextSteps.push("Cross-check with a local agronomy recommendation if needed");
  } else if (/soil|moisture|water|irrigat/.test(q)) {
    answer = irrigationDecision?.decision === "Irrigation required"
      ? `Zone ${zoneName} needs irrigation because soil moisture is below threshold and the trend is falling.`
      : `Zone ${zoneName} is currently within a safer moisture range.`;
    decision = irrigationDecision?.decision || "Irrigation context ready";
    reason = irrigationDecision?.reason || reason;
    action = irrigationDecision?.action || action;
    confidence = irrigationDecision?.confidence || confidence;
    riskLevel = irrigationDecision?.riskLevel || riskLevel;
    summary = irrigationDecision?.reason || summary;
    nextSteps.push("Monitor the moisture trend after irrigation");
    nextSteps.push("Compare the reading against the threshold");
  } else {
    const reference = topCrop?.crop || retrieval?.results?.[0]?.source?.crop || "the knowledge base";
    answer = `The closest agriculture reference I found is ${reference}.`;
    decision = "Agriculture answer ready";
    reason = "The response is based on the strongest RAG matches and live zone context.";
    action = "Review the evidence cards for the zone and crop match.";
    summary = "A general agriculture answer was generated from the available sources.";
    nextSteps.push("Review the top evidence item");
    nextSteps.push("Ask a follow-up question about crops, soil, irrigation, or logs");
  }

  return {
    decision,
    reason,
    action,
    confidence,
    riskLevel,
    answer,
    summary,
    evidence,
    nextSteps,
    recommendedCrops: cropDecision?.recommendedCrops,
    cropEvidence: cropDecision?.cropEvidence,
    irrigationLogs,
    roi,
  };
};

const runAgentQuery = async (question, options = {}) => {
  const isRelevant = isFarmQuestion(question) || isAgricultureGeneralQuestion(question);
  const cropIntent = isCropSuitabilityQuestion(question);
  const requestedDate = parseQuestionDate(question);
  const logIntent = isLogQuestion(question);
  const roiIntent = shouldCalculateROI(question);
  const zoneHint = options.zone || extractZoneHint(question);
  const [realtime, zoneConfig, trend, retrieval] = await Promise.all([
    getRealtimeData(zoneHint),
    getZoneConfig(zoneHint),
    analyzeTrend(zoneHint),
    searchKnowledge(question, { limit: 4 }),
  ]);
  const websiteContext = await scrapeWebsite();

  const data = trend?.latest || realtime.latest || {};
  const zone =
    zoneConfig ||
    realtime.zone?.toObject?.() ||
    realtime.zone ||
    trend.zone?.toObject?.() ||
    trend.zone ||
    null;
  const thresholdGap = await computeThresholdGap({ data, zone });
  const risk = await calculateRisk({ data, zone, trend });
  const prediction = await predictIrrigation({ data, zone, trend });
  const roi = roiIntent
    ? await calculateROI({
        zoneInput: zoneHint,
        systemCost: options.systemCost,
        costPerLiter: options.costPerLiter,
        litersPerReading: options.litersPerReading,
      })
    : null;
  const irrigationLogs = logIntent
    ? await getIrrigationLogs({
        zoneInput: zoneHint,
        dateInput: requestedDate || undefined,
        limit: options.limit || 20,
      })
    : null;

  const irrigationDecision = decideIrrigation({
    data,
    zone,
    trend,
    roi,
    retrieval,
  });

  const cropDecision = cropIntent
    ? decideCropSuitability({
        data,
        zone,
        trend,
        retrieval,
      })
    : null;

  const generalDecision = !cropIntent && isAgricultureGeneralQuestion(question)
    ? buildGeneralAgricultureFallback({
        question,
        zone,
        data,
        trend,
        retrieval,
        irrigationLogs: null,
        roi,
        websiteContext,
        cropDecision: null,
        irrigationDecision,
      })
    : null;

  const decision = cropDecision || generalDecision || irrigationDecision;

  const toolTrace = [
    buildToolTrace("getRealtimeData", realtime),
    buildToolTrace("getZoneConfig", zone),
    buildToolTrace("analyzeTrend", trend),
    buildToolTrace("computeThresholdGap", thresholdGap),
    buildToolTrace("calculateRisk", risk),
    buildToolTrace("predictIrrigation", prediction),
    ...(roi ? [buildToolTrace("calculateROI", roi)] : []),
    ...(irrigationLogs ? [buildToolTrace("getIrrigationLogs", irrigationLogs)] : []),
    ...(websiteContext?.configured ? [buildToolTrace("scrapeWebsite", websiteContext)] : []),
    buildToolTrace("ragRetriever", retrieval),
  ];

  const llmOutput = isRelevant
    ? await synthesizeAgentJSON({
      question,
      decision,
      toolTrace,
      retrieval,
      websiteContext,
    })
    : null;

  const agricultureAnswer = isRelevant
    ? await synthesizeAgricultureJSON({
      question,
      intent: cropIntent ? "crop" : logIntent ? "logs" : roiIntent ? "roi" : "general",
      context: {
        zone,
        data,
        trend,
        thresholdGap,
        risk,
        prediction,
        roi,
        irrigationLogs,
        decision,
      },
      toolTrace,
      retrieval,
      websiteContext,
    })
    : null;

  const localAgricultureFallback = buildGeneralAgricultureFallback({
    question,
    zone,
    data,
    trend,
    retrieval,
    irrigationLogs,
    roi,
    websiteContext,
    cropDecision: cropDecision || decision,
    irrigationDecision,
  });

  const finalAnswer = agricultureAnswer?.answer || agricultureAnswer?.summary || localAgricultureFallback.answer;
  const assistantMessage = !isRelevant
    ? "I can help with irrigation, crops, zone trends, logs, alerts, and ROI. Ask me about a zone, a date like 23rd, or a chart."
    : cropIntent
    ? `The best crop match for ${zone?.name || zoneHint || "the selected zone"} is ${decision.recommendedCrops?.[0]?.crop || "not available"} based on the zone readings and CSV knowledge base.`
    : irrigationLogs
    ? `I found ${irrigationLogs.summary.count} log entries for ${zone?.name || zoneHint || "the selected zone"}${requestedDate ? ` on ${requestedDate.toDateString()}` : ""}.`
    : finalAnswer;

  const response = {
    question,
    decision: decision.decision,
    reason: decision.reason,
    action: decision.action,
    confidence: decision.confidence,
    riskLevel: decision.riskLevel || risk.riskLevel,
    answer: finalAnswer,
    assistantMessage,
    mode: !isRelevant ? "guidance" : cropIntent ? "crop" : irrigationLogs ? "logs" : roiIntent ? "roi" : "qa",
    openRouter: getOpenRouterStatus(),
    llmOutput: agricultureAnswer || llmOutput,
    data: {
      zone,
      realtime: data,
      trend,
      thresholdGap,
      risk,
      prediction,
      roi,
      irrigationLogs,
      cropEvidence: decision.cropEvidence,
      recommendedCrops: decision.recommendedCrops,
      evidence: localAgricultureFallback.evidence,
      nextSteps: localAgricultureFallback.nextSteps,
    },
    retrieval,
    websiteContext,
    toolTrace,
  };

  return response;
};

module.exports = {
  runAgentQuery,
};
