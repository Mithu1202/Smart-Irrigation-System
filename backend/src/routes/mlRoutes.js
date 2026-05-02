/**
 * mlRoutes.js
 * ─────────────────────────────────────────────────────────
 * REST API endpoints for the ML-based irrigation prediction model.
 *
 * POST /api/ml/predict          → single prediction from sensor data
 * POST /api/ml/predict/batch    → batch predictions
 * GET  /api/ml/status           → model training status & metadata
 * GET  /api/ml/train            → trigger training (dev only)
 */

const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");
const path = require("path");
const mlService = require("../ai/mlService");
const Data = require("../models/Data");
const Zone = require("../models/Zone");

const ML_DIR      = path.join(__dirname, "..", "..", "..", "ml");
const TRAIN_PY    = path.join(ML_DIR, "train_model.py");

// ════════════════════════════════════════════════════════
// GET /api/ml/status
// Returns model metadata and training status
// ════════════════════════════════════════════════════════
router.get("/status", (req, res) => {
  const trained   = mlService.isModelTrained();
  const metadata  = mlService.getModelMetadata();

  res.json({
    modelTrained: trained,
    metadata: metadata || null,
    message: trained
      ? `Model trained on ${metadata?.trained_at || "unknown date"} — accuracy ${(metadata?.accuracy * 100).toFixed(2)}%`
      : "Model not yet trained. POST to /api/ml/train to begin training.",
  });
});

// ════════════════════════════════════════════════════════
// POST /api/ml/predict
// Single prediction from posted sensor data
// Body: { soilMoisture, temperature, humidity, ... }
// ════════════════════════════════════════════════════════
router.post("/predict", async (req, res) => {
  try {
    const sensorData = req.body;

    if (!sensorData || Object.keys(sensorData).length === 0) {
      return res.status(400).json({ error: "No sensor data provided in request body." });
    }

    const result = await mlService.predict(sensorData);

    if (!result.success) {
      return res.status(503).json({
        error: result.error,
        fallback: result.fallback || false,
        suggestion: "Train the model first: python ml/train_model.py",
      });
    }

    res.json({
      success: true,
      prediction: {
        irrigationNeed: result.irrigationNeed,
        label: result.label,
        confidence: result.confidence,
        probabilities: result.probabilities,
      },
      input: sensorData,
    });
  } catch (err) {
    console.error("[MLRoute] /predict error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════
// POST /api/ml/predict/zone/:zoneId
// Predict using the latest DB reading for a zone
// ════════════════════════════════════════════════════════
router.post("/predict/zone/:zoneId", async (req, res) => {
  try {
    const { zoneId } = req.params;

    // Fetch zone config
    const zone = await Zone.findOne({ zoneId });
    if (!zone) return res.status(404).json({ error: `Zone '${zoneId}' not found.` });

    // Fetch latest sensor reading for zone
    const latest = await Data.findOne({ zone: zoneId }).sort({ timestamp: -1 }).lean();
    if (!latest) {
      return res.status(404).json({
        error: `No sensor data found for zone '${zoneId}'.`,
        suggestion: "Make sure the MQTT device is publishing data.",
      });
    }

    // Build input for ML service
    const sensorData = {
      soilMoisture:   latest.soilMoisture,
      temperature:    latest.temperature,
      humidity:       latest.humidity,
      cropType:       zone.crop || "Wheat",
      soilType:       req.body.soilType || "Loamy",
      season:         req.body.season || "Kharif",
      irrigationType: req.body.irrigationType || "Drip",
      region:         req.body.region || "Central",
      ...req.body,   // allow body overrides
    };

    const result = await mlService.predict(sensorData);

    res.json({
      success: true,
      zoneId,
      zoneName: zone.name,
      prediction: result.success ? {
        irrigationNeed: result.irrigationNeed,
        label: result.label,
        confidence: result.confidence,
        probabilities: result.probabilities,
      } : null,
      mlError: result.success ? undefined : result.error,
      latestReading: {
        soilMoisture: latest.soilMoisture,
        temperature:  latest.temperature,
        humidity:     latest.humidity,
        timestamp:    latest.timestamp,
      },
    });
  } catch (err) {
    console.error("[MLRoute] /predict/zone error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════
// POST /api/ml/predict/batch
// Batch predict for multiple zones using their latest readings
// Body: { zoneIds: ["zone1","zone2"], season: "Kharif", ... }
// ════════════════════════════════════════════════════════
router.post("/predict/batch", async (req, res) => {
  try {
    const { zoneIds, ...extra } = req.body;

    if (!zoneIds || !Array.isArray(zoneIds) || zoneIds.length === 0) {
      return res.status(400).json({ error: "Provide zoneIds array in request body." });
    }

    const results = await Promise.all(
      zoneIds.map(async (zoneId) => {
        try {
          const zone   = await Zone.findOne({ zoneId });
          const latest = await Data.findOne({ zone: zoneId }).sort({ timestamp: -1 }).lean();

          if (!zone || !latest) {
            return { zoneId, error: "Zone or data not found" };
          }

          const input = {
            soilMoisture: latest.soilMoisture,
            temperature:  latest.temperature,
            humidity:     latest.humidity,
            cropType:     zone.crop,
            ...extra,
          };

          const result = await mlService.predict(input);
          return {
            zoneId,
            zoneName: zone.name,
            prediction: result.success ? result : null,
            error: result.success ? undefined : result.error,
          };
        } catch (e) {
          return { zoneId, error: e.message };
        }
      })
    );

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════
// POST /api/ml/train
// Trigger ML training (runs train_model.py as a child process)
// Streams output back as newline-delimited text
// ════════════════════════════════════════════════════════
router.post("/train", (req, res) => {
  console.log("[MLRoute] Starting ML training …");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.write("=== Smart Irrigation ML Training ===\n");

  const python = process.platform === "win32" ? "python" : "python3";
  const child = spawn(python, [TRAIN_PY], {
    cwd: ML_DIR,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  child.stdout.on("data", (d) => {
    const txt = d.toString();
    process.stdout.write(txt);
    res.write(txt);
  });

  child.stderr.on("data", (d) => {
    const txt = d.toString();
    process.stderr.write(txt);
    res.write(`[STDERR] ${txt}`);
  });

  child.on("close", (code) => {
    const msg = code === 0
      ? "\n✓ Training complete!\n"
      : `\n✗ Training failed (exit code ${code})\n`;
    res.write(msg);
    res.end();
  });

  child.on("error", (err) => {
    res.write(`\n[ERROR] ${err.message}\n`);
    res.end();
  });
});

module.exports = router;
