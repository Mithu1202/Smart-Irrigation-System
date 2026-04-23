const Data = require("../models/Data");
const { enrichWindow } = require("../analytics/featureEngineering");
const { resolveZone } = require("./zoneLookup");

const analyzeTrend = async (zoneInput) => {
  try {
    const zone = await resolveZone(zoneInput);
    if (!zone) {
      return {
        zone: null,
        trend: null,
        readings: [],
      };
    }

    const readings = await Data.find({ zone: zone.name })
      .sort({ timestamp: -1 })
      .limit(24);

    const ordered = [...readings].reverse();
    const enriched = enrichWindow({
      readings: ordered,
      zone,
      lookbackWindow: 24,
    });

    const latest = enriched[enriched.length - 1] || null;
    const previous = enriched[enriched.length - 2] || null;
    const moistureTrend = latest?.moistureTrend ?? 0;
    const averageMoisture = enriched.length
      ? Math.round(
          enriched.reduce((sum, item) => sum + (item.soilMoisture || 0), 0) /
            enriched.length
        )
      : 0;
    const trendDirection =
      moistureTrend < -2 ? "falling" : moistureTrend > 2 ? "rising" : "stable";

    return {
      zone: zone.toObject(),
      latest,
      previous,
      moistureTrend,
      trendDirection,
      averageMoisture,
      readings: enriched,
    };
  } catch (error) {
    return {
      zone: null,
      latest: null,
      previous: null,
      moistureTrend: 0,
      trendDirection: "stable",
      averageMoisture: 0,
      readings: [],
      error: error.message,
    };
  }
};

module.exports = analyzeTrend;
