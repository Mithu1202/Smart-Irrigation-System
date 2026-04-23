const Data = require("../models/Data");
const { calculateROI } = require("../analytics/roi");
const { resolveZone } = require("./zoneLookup");
const { enrichWindow } = require("../analytics/featureEngineering");

const calculateROIForZone = async ({ zoneInput, systemCost, costPerLiter, litersPerReading }) => {
  try {
    const zone = await resolveZone(zoneInput);
    if (!zone) {
      return null;
    }

    const history = await Data.find({ zone: zone.name })
      .sort({ timestamp: -1 })
      .limit(120);

    const enriched = enrichWindow({
      readings: [...history].reverse(),
      zone,
      lookbackWindow: 24,
    });

    return {
      zone: zone.toObject(),
      ...calculateROI({
        history: enriched,
        systemCost,
        costPerLiter,
        litersPerReading,
      }),
    };
  } catch (error) {
    return null;
  }
};

module.exports = calculateROIForZone;
