const { calculateRiskLevel } = require("../analytics/featureEngineering");

const calculateRisk = async ({ data, zone, trend = {} }) => {
  const soilMoisture = Number(data?.soilMoisture ?? 0);
  const threshold = Number(zone?.moistureThreshold ?? 40);
  const moistureTrend = Number(trend?.moistureTrend ?? 0);
  const thresholdGap = soilMoisture - threshold;
  const temperature = Number(data?.temperature ?? 0);
  const humidity = Number(data?.humidity ?? 0);
  const waterStressIndex = Number(trend?.waterStressIndex ?? 0);
  const riskLevel = calculateRiskLevel({
    thresholdGap,
    moistureTrend,
    temperature,
    humidity,
    waterStressIndex,
  });

  const riskScore =
    riskLevel === "HIGH" ? 85 : riskLevel === "MEDIUM" ? 55 : 20;

  return {
    riskLevel,
    riskScore,
    thresholdGap,
    moistureTrend,
    temperature,
    humidity,
    waterStressIndex,
  };
};

module.exports = calculateRisk;
