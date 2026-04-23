const { calculateRiskLevel } = require("../analytics/featureEngineering");

const predictIrrigation = async ({ data, zone, trend = {} }) => {
  const soilMoisture = Number(data?.soilMoisture ?? 0);
  const threshold = Number(zone?.moistureThreshold ?? 40);
  const moistureTrend = Number(trend?.moistureTrend ?? 0);
  const thresholdGap = soilMoisture - threshold;
  const waterStressIndex = Number(trend?.waterStressIndex ?? 0);
  const riskLevel = calculateRiskLevel({
    thresholdGap,
    moistureTrend,
    temperature: Number(data?.temperature ?? 0),
    humidity: Number(data?.humidity ?? 0),
    waterStressIndex,
  });

  const irrigationNeeded = thresholdGap < 0 && moistureTrend <= 0;
  const confidence = irrigationNeeded
    ? Math.min(0.98, 0.7 + Math.abs(thresholdGap) / 100 + Math.abs(moistureTrend) / 50)
    : Math.max(0.35, 0.75 - Math.abs(thresholdGap) / 120);

  return {
    irrigationNeeded,
    confidence: Math.round(confidence * 100) / 100,
    riskLevel,
    action: irrigationNeeded ? "Activate pump" : "Hold irrigation",
  };
};

module.exports = predictIrrigation;
