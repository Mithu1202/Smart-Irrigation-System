const Data = require("../models/Data");
const { resolveZone } = require("./zoneLookup");

const buildDateRange = (dateInput) => {
  const now = dateInput ? new Date(dateInput) : new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const getIrrigationLogs = async ({ zoneInput, dateInput, limit = 20 } = {}) => {
  try {
    const zone = await resolveZone(zoneInput);
    const { start, end } = buildDateRange(dateInput);

    const query = {
      timestamp: { $gte: start, $lt: end },
    };

    if (zone?.name) {
      query.zone = zone.name;
    } else if (zoneInput) {
      query.zone = zoneInput;
    }

    const logs = await Data.find(query).sort({ timestamp: -1 }).limit(limit);

    const summary = {
      count: logs.length,
      pumpOnCount: logs.filter((log) => String(log.pumpStatus).toUpperCase() === "ON").length,
      criticalCount: logs.filter((log) => log.riskLevel === "HIGH").length,
      avgMoisture:
        logs.length > 0
          ? Math.round(logs.reduce((sum, log) => sum + (log.soilMoisture || 0), 0) / logs.length)
          : 0,
      avgTemperature:
        logs.length > 0
          ? Math.round(
              (logs.reduce((sum, log) => sum + (log.temperature || 0), 0) / logs.length) * 10
            ) / 10
          : 0,
    };

    return {
      zone: zone ? zone.toObject() : null,
      dateRange: { start, end },
      summary,
      logs: logs.map((log) => log.toObject()),
    };
  } catch (error) {
    return {
      zone: null,
      dateRange: null,
      summary: { count: 0, pumpOnCount: 0, criticalCount: 0, avgMoisture: 0, avgTemperature: 0 },
      logs: [],
      error: error.message,
    };
  }
};

module.exports = getIrrigationLogs;
