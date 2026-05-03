/**
 * mlRoutes.js
 * ─────────────────────────────────────────────────────────
 * REST API endpoints for the ML-based irrigation prediction model.
 *
 * POST /api/ml/predict              → agricultural advisory prediction
 * POST /api/ml/predict/batch        → batch agricultural predictions
 * GET  /api/ml/status               → agricultural model status
 * POST /api/ml/train                → trigger agricultural training
 *
 * POST /api/ml/iot-predict          → IoT time-series prediction (regression + classification)
 * POST /api/ml/iot-train            → trigger IoT model training
 * GET  /api/ml/iot-status           → IoT model metadata
 * GET  /api/ml/iot-forecast/:zoneId → 6-step recursive moisture forecast
 */

const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const mlService = require("../ai/mlService");
const Data = require("../models/Data");
const Zone = require("../models/Zone");

const ML_DIR           = path.join(__dirname, "..", "..", "..", "ml");
const TRAIN_PY         = path.join(ML_DIR, "train_model.py");
const IOT_TRAIN_PY     = path.join(ML_DIR, "train_iot_timeseries.py");
const IOT_PREDICT_PY   = path.join(ML_DIR, "predict_iot.py");
const IOT_META_PATH    = path.join(ML_DIR, "models", "iot_model_metadata.json");

// Resolve Python executable — prefer the same Python that installed our packages.
// Checks common Windows locations, then falls back to PATH 'python'.
const PYTHON_CANDIDATES = [
  process.env.PYTHON_PATH,                             // env override
  path.join(__dirname, "..", "..", "..", ".venv", "Scripts", "python.exe"),
  "C:\\Users\\mithu\\AppData\\Local\\Programs\\Python\\Python311\\python.exe",
  "C:\\Python311\\python.exe",
  "C:\\Python310\\python.exe",
];

const PYTHON_EXE = (() => {
  for (const p of PYTHON_CANDIDATES) {
    if (p && fs.existsSync(p)) return p;
  }
  return process.platform === "win32" ? "python" : "python3";
})();

console.log(`[MLRoute] Using Python: ${PYTHON_EXE}`);

// ── Helper: run a Python script with JSON input, return JSON output ──────────
function runPythonPredict(scriptPath, inputObj) {
  return new Promise((resolve, reject) => {
    const python = PYTHON_EXE;
    const child = spawn(python, [scriptPath], {
      cwd: ML_DIR,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });

    child.on("close", (code) => {
      const raw = stdout.trim();
      // Find last JSON line (Python may print warnings before)
      const jsonLines = raw.split("\n").filter(l => l.startsWith("{"));
      const lastJson = jsonLines[jsonLines.length - 1] || raw;
      try {
        resolve(JSON.parse(lastJson));
      } catch (e) {
        reject(new Error(`Python parse error (exit ${code}): ${stderr || raw}`));
      }
    });

    child.on("error", reject);
    child.stdin.write(JSON.stringify(inputObj));
    child.stdin.end();
  });
}

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

  const python = PYTHON_EXE;
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

// ════════════════════════════════════════════════════════
// POST /api/ml/iot-predict
// IoT time-series prediction: next moisture + irrigation need
// Body: { soil_moisture, soil_temp, air_temp, humidity, wind_speed,
//         rainfall, evaporation_rate, prev_moisture, pump_status, ... }
// ════════════════════════════════════════════════════════
router.post("/iot-predict", async (req, res) => {
  try {
    const sensorData = req.body;
    if (!sensorData || Object.keys(sensorData).length === 0) {
      return res.status(400).json({ error: "No sensor data provided." });
    }

    const result = await runPythonPredict(IOT_PREDICT_PY, sensorData);

    if (!result.success) {
      return res.status(result.modelNotTrained ? 503 : 500).json({
        error: result.error,
        suggestion: result.modelNotTrained
          ? "Run: python ml/train_iot_timeseries.py"
          : undefined,
      });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[MLRoute] /iot-predict error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════
// GET /api/ml/iot-forecast/:zoneId
// Fetch the latest reading for a zone and return a 6-step forecast
// ════════════════════════════════════════════════════════
router.get("/iot-forecast/:zoneId", async (req, res) => {
  try {
    const { zoneId } = req.params;

    // Get last 3 readings for lag features
    const readings = await Data.find({ zone: zoneId })
      .sort({ timestamp: -1 })
      .limit(3)
      .lean();

    if (!readings || readings.length === 0) {
      return res.status(404).json({ error: `No sensor data for zone '${zoneId}'.` });
    }

    const latest  = readings[0];
    const prev1   = readings[1];
    const prev2   = readings[2];

    const sensorData = {
      // soilMoisture is already % — MQTT handler converts raw ADC from ESP32
      soil_moisture:    latest.soilMoisture,
      // ESP32 sends soil_temp via DS18B20 → stored as soilTemp by MQTT handler
      soil_temp:        latest.soilTemp || latest.temperature,
      air_temp:         latest.temperature,
      humidity:         latest.humidity,
      wind_speed:       latest.windSpeed    || 10,
      rainfall:         latest.rainfall     || 0,
      evaporation_rate: latest.evaporationRate || 3,
      water_flow_rate:  latest.waterFlowRate   || 0,
      pump_status:      latest.pumpStatus   || "OFF",
      // Lag features from last 3 readings (already % values)
      lag_1_moisture:   prev1?.soilMoisture  || latest.soilMoisture,
      lag_2_moisture:   prev2?.soilMoisture  || prev1?.soilMoisture || latest.soilMoisture,
      prev_moisture:    prev1?.soilMoisture  || latest.soilMoisture,
      moisture_change:  prev1
        ? (latest.soilMoisture - prev1.soilMoisture)
        : 0,
    };

    const result = await runPythonPredict(IOT_PREDICT_PY, sensorData);

    if (!result.success) {
      return res.status(503).json({ error: result.error });
    }

    res.json({
      success:          true,
      zoneId,
      current_moisture: latest.soilMoisture,
      timestamp:        latest.timestamp,
      forecast:         result.forecast || [],
      next_moisture:    result.next_moisture,
      irrigation_needed: result.irrigation_needed,
      irrigation_probability: result.irrigation_probability,
      alert_level:      result.alert_level,
      recommendation:   result.recommendation,
      model:            result.model,
    });
  } catch (err) {
    console.error("[MLRoute] /iot-forecast error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════
// GET /api/ml/iot-status
// Returns IoT model metadata
// ════════════════════════════════════════════════════════
router.get("/iot-status", (req, res) => {
  try {
    if (!fs.existsSync(IOT_META_PATH)) {
      return res.json({
        modelTrained: false,
        message: "IoT model not trained. Run: python ml/train_iot_timeseries.py",
      });
    }
    const meta = JSON.parse(fs.readFileSync(IOT_META_PATH, "utf-8"));
    res.json({
      modelTrained: true,
      metadata: meta,
      message: `IoT model trained at ${meta.trained_at} — Reg RMSE=${meta.reg_rmse}, Clf F1=${meta.clf_f1}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════
// POST /api/ml/iot-train
// Trigger IoT model training (streams output)
// ════════════════════════════════════════════════════════
router.post("/iot-train", (req, res) => {
  console.log("[MLRoute] Starting IoT ML training …");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.write("=== Smart Irrigation IoT ML Training ===\n");

  const python = PYTHON_EXE;
  const child = spawn(python, [IOT_TRAIN_PY], {
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
    // Don't write python warnings to client unless it's a real error
    if (txt.includes("Error") || txt.includes("Traceback")) {
      res.write(`[STDERR] ${txt}`);
    }
  });
  child.on("close", (code) => {
    const msg = code === 0
      ? "\n✓ IoT Training complete!\n"
      : `\n✗ IoT Training failed (exit code ${code})\n`;
    res.write(msg);
    res.end();
  });
  child.on("error", (err) => {
    res.write(`\n[ERROR] ${err.message}\n`);
    res.end();
  });
});

module.exports = router;
