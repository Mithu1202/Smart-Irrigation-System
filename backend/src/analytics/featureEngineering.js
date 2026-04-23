const HOURS = {
  night: [0, 5],
  morning: [6, 11],
  afternoon: [12, 17],
  evening: [18, 21],
  lateEvening: [22, 23],
};

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getTimeOfDay = (timestamp) => {
  const hour = new Date(timestamp).getHours();
  for (const [label, [start, end]] of Object.entries(HOURS)) {
    if (hour >= start && hour <= end) {
      return label;
    }
  }
  return "night";
};

const calculateStdDev = (values) => {
  if (!values.length) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) /
    values.length;
  return Math.sqrt(variance);
};

const calculateRiskLevel = ({
  thresholdGap,
  moistureTrend,
  temperature,
  humidity,
  waterStressIndex,
}) => {
  if (thresholdGap < -10 || waterStressIndex >= 75 || temperature >= 38) {
    return "HIGH";
  }

  if (
    thresholdGap < 0 ||
    moistureTrend < 0 ||
    humidity < 35 ||
    waterStressIndex >= 50
  ) {
    return "MEDIUM";
  }

  return "LOW";
};

const buildEnrichedRecord = ({
  current,
  previous,
  zone,
  windowReadings,
  irrigationEvents,
}) => {
  const soilMoisture = safeNumber(current?.soilMoisture);
  const temperature = safeNumber(current?.temperature);
  const humidity = safeNumber(current?.humidity);
  const threshold = safeNumber(zone?.moistureThreshold, 40);
  const previousMoisture = safeNumber(previous?.soilMoisture, soilMoisture);
  const previousTemperature = safeNumber(previous?.temperature, temperature);
  const previousHumidity = safeNumber(previous?.humidity, humidity);
  const moistureTrend = soilMoisture - previousMoisture;
  const thresholdGap = soilMoisture - threshold;
  const moistureValues = windowReadings.map((reading) =>
    safeNumber(reading.soilMoisture)
  );
  const avgMoisture_24h =
    moistureValues.length > 0
      ? Math.round(
          moistureValues.reduce((sum, value) => sum + value, 0) /
            moistureValues.length
        )
      : soilMoisture;
  const moistureVolatility = Math.round(calculateStdDev(moistureValues) * 10) / 10;
  const temperatureDelta = temperature - previousTemperature;
  const humidityDelta = humidity - previousHumidity;
  const lowMoisturePressure = clamp(Math.abs(Math.min(0, thresholdGap)) * 4, 0, 60);
  const dryingPressure = moistureTrend < 0 ? Math.abs(moistureTrend) * 3 : 0;
  const heatPressure = temperature > 34 ? (temperature - 34) * 4 : 0;
  const humidityPressure = humidity < 40 ? (40 - humidity) * 1.5 : 0;
  const waterStressIndex = Math.round(
    clamp(lowMoisturePressure + dryingPressure + heatPressure + humidityPressure, 0, 100)
  );
  const irrigationNeed = thresholdGap < 0 && moistureTrend <= 0;
  const riskLevel = calculateRiskLevel({
    thresholdGap,
    moistureTrend,
    temperature,
    humidity,
    waterStressIndex,
  });
  const recentIrrigationCount = irrigationEvents.filter(
    (reading) => reading.pumpStatus === "ON"
  ).length;

  return {
    ...current,
    soilMoisture,
    temperature,
    humidity,
    moistureTrend,
    avgMoisture_24h,
    thresholdGap,
    riskLevel,
    irrigationNeed,
    timeOfDay: getTimeOfDay(current?.timestamp || Date.now()),
    temperatureDelta,
    humidityDelta,
    moistureVolatility,
    waterStressIndex,
    recentIrrigationCount,
    stressDrivers: {
      lowMoisturePressure: Math.round(lowMoisturePressure * 10) / 10,
      dryingPressure: Math.round(dryingPressure * 10) / 10,
      heatPressure: Math.round(heatPressure * 10) / 10,
      humidityPressure: Math.round(humidityPressure * 10) / 10,
    },
  };
};

const enrichWindow = ({ readings, zone, lookbackWindow = 24 }) => {
  const ordered = [...readings].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
  return ordered.map((current, index) => {
    const windowStart = Math.max(0, index - lookbackWindow + 1);
    const windowReadings = ordered.slice(windowStart, index + 1);
    const irrigationEvents = windowReadings.filter((reading) =>
      String(reading.pumpStatus || "").toUpperCase() === "ON"
    );
    return buildEnrichedRecord({
      current,
      previous: ordered[index - 1],
      zone,
      windowReadings,
      irrigationEvents,
    });
  });
};

module.exports = {
  buildEnrichedRecord,
  calculateRiskLevel,
  enrichWindow,
  getTimeOfDay,
};
