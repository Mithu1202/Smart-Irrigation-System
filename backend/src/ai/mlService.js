/**
 * mlService.js
 * ─────────────────────────────────────────────────────────
 * Node.js bridge to the Python ML model.
 * Calls ml/predict.py via child_process.spawn and returns
 * the parsed JSON prediction result.
 *
 * Usage:
 *   const mlService = require('./mlService');
 *   const result = await mlService.predict({ soilMoisture: 28, temperature: 35, ... });
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const ML_DIR      = path.join(__dirname, "..", "..", "..", "ml");
const PREDICT_PY  = path.join(ML_DIR, "predict.py");
const METADATA    = path.join(ML_DIR, "models", "model_metadata.json");

/**
 * Check if the ML model has been trained (artefacts exist).
 */
function isModelTrained() {
  const modelPath = path.join(ML_DIR, "models", "irrigation_rf_model.pkl");
  return fs.existsSync(modelPath);
}

/**
 * Read training metadata (accuracy, date, features, etc.)
 */
function getModelMetadata() {
  if (!fs.existsSync(METADATA)) return null;
  try {
    return JSON.parse(fs.readFileSync(METADATA, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Run the Python prediction service.
 * @param {Object} sensorData  - Live sensor readings (camelCase keys)
 * @returns {Promise<Object>}  - { irrigationNeed, confidence, probabilities, label, success }
 */
function predict(sensorData) {
  return new Promise((resolve, reject) => {
    if (!isModelTrained()) {
      return resolve({
        success: false,
        error: "ML model not trained. Please run: python ml/train_model.py",
        fallback: true,
      });
    }

    const python = process.platform === "win32" ? "python" : "python3";
    const child = spawn(python, [PREDICT_PY], {
      cwd: ML_DIR,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("close", (code) => {
      if (code !== 0) {
        console.error("[MLService] Python process error:", stderr);
        return resolve({
          success: false,
          error: `Python exited with code ${code}: ${stderr.slice(0, 200)}`,
          fallback: true,
        });
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (e) {
        resolve({
          success: false,
          error: `Failed to parse Python output: ${stdout.slice(0, 200)}`,
          fallback: true,
        });
      }
    });

    // Send sensor data to Python via stdin
    child.stdin.write(JSON.stringify(sensorData));
    child.stdin.end();

    // Timeout after 15 seconds
    const timeout = setTimeout(() => {
      child.kill();
      resolve({
        success: false,
        error: "ML prediction timed out (15s)",
        fallback: true,
      });
    }, 15000);

    child.on("close", () => clearTimeout(timeout));
  });
}

module.exports = { predict, isModelTrained, getModelMetadata };
