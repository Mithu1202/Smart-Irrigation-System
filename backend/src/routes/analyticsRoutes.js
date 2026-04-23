const express = require("express");
const Data = require("../models/Data");
const Zone = require("../models/Zone");
const { enrichWindow } = require("../analytics/featureEngineering");
const { calculateROI } = require("../analytics/roi");
const { resolveZone } = require("../tools/zoneLookup");
const getIrrigationLogs = require("../tools/getIrrigationLogs");

const router = express.Router();

const loadZoneHistory = async (zoneInput, limit = 48) => {
  const zone = await resolveZone(zoneInput);
  if (!zone) return { zone: null, readings: [] };

  const readings = await Data.find({ zone: zone.name })
    .sort({ timestamp: -1 })
    .limit(limit);

  return { zone, readings };
};

router.get("/enriched-data", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 20, 200));
    const zoneInput = req.query.zone;
    const zone = await resolveZone(zoneInput);

    if (!zone) {
      return res.status(404).json({ error: "Zone not found" });
    }

    const readings = await Data.find({ zone: zone.name })
      .sort({ timestamp: -1 })
      .limit(Math.max(limit, 48));

    const enriched = enrichWindow({
      readings: [...readings].reverse(),
      zone,
      lookbackWindow: 24,
    }).reverse();

    res.json({
      zone: zone.toObject(),
      count: enriched.length,
      enriched,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/roi", async (req, res) => {
  try {
    const zoneInput = req.query.zone;
    const systemCost = Number(req.query.systemCost ?? 250);
    const costPerLiter = Number(req.query.costPerLiter ?? 0.08);
    const litersPerReading = Number(req.query.litersPerReading ?? 2);
    const { zone, readings } = await loadZoneHistory(zoneInput, 120);

    if (!zone) {
      return res.status(404).json({ error: "Zone not found" });
    }

    const enriched = enrichWindow({
      readings: [...readings].reverse(),
      zone,
      lookbackWindow: 24,
    });

    const roi = calculateROI({
      history: enriched,
      systemCost,
      costPerLiter,
      litersPerReading,
    });

    res.json({
      zone: zone.toObject(),
      ...roi,
      sampleSize: enriched.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const zones = await Zone.find().sort({ zoneId: 1 });
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await Data.find({ timestamp: { $gte: last24h } });

    const enrichedCounts = await Promise.all(
      zones.map(async (zone) => {
        const { readings } = await loadZoneHistory(zone.zoneId, 24);
        const enriched = enrichWindow({
          readings: [...readings].reverse(),
          zone,
          lookbackWindow: 24,
        });
        return {
          zoneId: zone.zoneId,
          zone: zone.name,
          irrigationNeeded: enriched.filter((item) => item.irrigationNeed).length,
          highRiskReadings: enriched.filter((item) => item.riskLevel === "HIGH").length,
        };
      })
    );

    res.json({
      zones: zones.length,
      readings24h: recent.length,
      enrichedCounts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/logs", async (req, res) => {
  try {
    const date = req.query.date;
    const zone = req.query.zone;
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 20, 100));
    const result = await getIrrigationLogs({ zoneInput: zone, dateInput: date, limit });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
