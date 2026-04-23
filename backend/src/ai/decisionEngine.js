const { calculateRiskLevel } = require("../analytics/featureEngineering");

const decideIrrigation = ({ data, zone, trend, roi, retrieval }) => {
  const soilMoisture = Number(data?.soilMoisture ?? 0);
  const threshold = Number(zone?.moistureThreshold ?? 40);
  const moistureTrend = Number(trend?.moistureTrend ?? 0);
  const thresholdGap = soilMoisture - threshold;
  const riskLevel = calculateRiskLevel({
    thresholdGap,
    moistureTrend,
    temperature: Number(data?.temperature ?? 0),
    humidity: Number(data?.humidity ?? 0),
    waterStressIndex: Number(trend?.waterStressIndex ?? 0),
  });

  const irrigationNeeded = thresholdGap < 0 && moistureTrend <= 0;
  const action = irrigationNeeded
    ? `Activate pump for ${zone?.name || zone?.zoneId || "selected zone"}`
    : `Keep pump off for ${zone?.name || zone?.zoneId || "selected zone"}`;
  const reason = irrigationNeeded
    ? "Soil moisture is below the threshold and the trend is declining."
    : "Moisture is at or above the threshold, or the trend is improving.";

  return {
    decision: irrigationNeeded ? "Irrigation required" : "Monitor only",
    reason,
    action,
    riskLevel,
    thresholdGap,
    irrigationNeeded,
    confidence: irrigationNeeded ? 0.9 : 0.78,
    retrieval,
    roi,
  };
};

const calculateSuitabilityScore = ({ current, target }) => {
  const moistureDiff = Math.abs((current.soilMoisture ?? 0) - (target.soilMoisture ?? 0));
  const temperatureDiff = Math.abs((current.temperature ?? 0) - (target.temperature ?? 0));
  const humidityDiff = Math.abs((current.humidity ?? 0) - (target.humidity ?? 0));
  const rainfallDiff = Math.abs((current.rainfall ?? 0) - (target.rainfall ?? 0));

  const distance =
    moistureDiff * 2 +
    temperatureDiff * 1.5 +
    humidityDiff * 1.2 +
    rainfallDiff * 0.8;

  return Math.max(0, Math.round((100 - distance) * 10) / 10);
};

const decideCropSuitability = ({ data, zone, trend, retrieval }) => {
  const current = {
    soilMoisture: Number(data?.soilMoisture ?? 0),
    temperature: Number(data?.temperature ?? 0),
    humidity: Number(data?.humidity ?? 0),
    rainfall: Number(data?.rainfall ?? 0),
  };
  const hasLiveTelemetry =
    Number.isFinite(current.soilMoisture) &&
    Number.isFinite(current.temperature) &&
    Number.isFinite(current.humidity) &&
    (current.soilMoisture > 0 || current.temperature > 0 || current.humidity > 0);

  const candidates = (retrieval?.results || [])
    .map((item, index) => {
      const source = item.source || {};
      const normalized = source.normalized || {};
      const fallbackScore = Math.max(55, 90 - index * 10);
      const liveScore = calculateSuitabilityScore({
        current,
        target: normalized,
      });
      return {
        crop: source.crop || source.name || source.title || "Unknown crop",
        description: source.description || source.recommendation || source.text || "",
        recommendation: source.recommendation || "",
        matchScore: hasLiveTelemetry ? liveScore : fallbackScore,
        target: normalized,
        sourceId: source.id || item.id,
        evidenceText: item.text || "",
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  const top = candidates.slice(0, 3);
  const best = top[0] || null;
  const currentThreshold = Number(zone?.moistureThreshold ?? 0);
  const thresholdGap = current.soilMoisture - currentThreshold;
  const trendDirection = trend?.trendDirection || "stable";
  const irrigationNeed = thresholdGap < 0 && trendDirection === "falling";

  const decision = best
    ? `${best.crop} is suitable for ${zone?.name || zone?.zoneId || "this zone"}`
    : `No crop match found for ${zone?.name || zone?.zoneId || "this zone"}`;

  const reason = best
    ? hasLiveTelemetry
      ? `The zone conditions are closest to ${best.crop} based on soil moisture, temperature, humidity, and rainfall patterns from MongoDB readings plus the CSV knowledge base.`
      : `Live zone telemetry was not available, so this recommendation is based on the CSV knowledge base and the crop match ranking.`
    : "The knowledge base did not produce a reliable crop match.";

  const action = best
    ? `Consider ${best.crop} for ${zone?.name || zone?.zoneId || "this zone"} and review the current threshold and irrigation plan.`
    : "Review the zone conditions and expand the crop knowledge base.";

  return {
    decision,
    reason,
    action,
    riskLevel: irrigationNeed ? "HIGH" : thresholdGap < 0 ? "MEDIUM" : "LOW",
    thresholdGap,
    irrigationNeeded: irrigationNeed,
    confidence: best ? Math.min(0.95, Math.max(0.65, best.matchScore / 100)) : 0.5,
    recommendedCrops: top.map((item) => ({
      crop: item.crop,
      matchScore: item.matchScore,
      recommendation: item.recommendation || item.description,
      evidence: item.evidenceText,
      sourceId: item.sourceId,
      target: item.target,
    })),
    cropEvidence: {
      current: hasLiveTelemetry ? current : null,
      threshold: currentThreshold,
      zone: zone?.name || zone?.zoneId || null,
      trendDirection,
      liveTelemetry: hasLiveTelemetry,
    },
    retrieval,
  };
};

module.exports = {
  decideCropSuitability,
  decideIrrigation,
};
