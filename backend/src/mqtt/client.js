require("dotenv").config();

const mqtt = require("mqtt");
const Data = require("../models/Data");
const Zone = require("../models/Zone");

// Convert raw ADC soil moisture to percentage (calibrate these values for your sensor)
const convertSoilMoisture = (rawValue) => {
  const DRY_VALUE = 4095; // ADC value when completely dry
  const WET_VALUE = 1500; // ADC value when completely wet
  const percentage = ((DRY_VALUE - rawValue) / (DRY_VALUE - WET_VALUE)) * 100;
  return Math.max(0, Math.min(100, Math.round(percentage)));
};

// Alert thresholds
const ALERT_THRESHOLDS = {
  moistureLow: 25,
  moistureHigh: 80,
  tempHigh: 35,
  tempLow: 10,
};

// --- MQTT CONNECTION ---
const client = mqtt.connect(process.env.MQTT_URL, {
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
  reconnectPeriod: 5000, // auto reconnect every 5 sec
  connectTimeout: 30 * 1000,
});

// --- ON CONNECT ---
client.on("connect", () => {
  console.log("✅ MQTT Connected");

  client.subscribe("smart_irrigation/data", (err) => {
    if (err) {
      console.error("❌ Subscribe error:", err);
    } else {
      console.log("📡 Subscribed to topic: smart_irrigation/data");
    }
  });
});

// --- PUBLISH PUMP COMMAND TO ESP32 ---
const publishPumpCommand = (deviceId, pumpState) => {
  const topic = `smart_irrigation/control/${deviceId}`;
  const payload = JSON.stringify({
    command: "pump",
    state: pumpState ? "ON" : "OFF",
    timestamp: new Date().toISOString(),
  });
  
  client.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) {
      console.error("❌ Failed to publish pump command:", err);
    } else {
      console.log(`📤 Pump command sent to ${deviceId}: ${pumpState ? "ON" : "OFF"}`);
    }
  });
};

// Export for use in routes
module.exports.publishPumpCommand = publishPumpCommand;

// --- ON MESSAGE ---
client.on("message", async (topic, message) => {
  if (topic !== "smart_irrigation/data") return;

  try {
    // Replace nan/NaN with null before parsing (ESP32 sometimes sends invalid JSON)
    let messageStr = message.toString();
    messageStr = messageStr.replace(/:\s*nan\s*,/gi, ': null,');
    messageStr = messageStr.replace(/:\s*nan\s*}/gi, ': null}');
    
    const payload = JSON.parse(messageStr);

    console.log("📩 Incoming:", payload);

    // --- BASIC VALIDATION ---
    if (payload.soil_moisture === null || payload.soil_moisture === undefined) {
      console.warn("⚠️ Invalid soil_moisture, skipping...");
      return;
    }
    
    // Use defaults for invalid temperature/humidity
    const temperature = (payload.temperature !== null && !isNaN(payload.temperature)) 
      ? payload.temperature : 0;
    const humidity = (payload.humidity !== null && !isNaN(payload.humidity)) 
      ? payload.humidity : 0;

    // Convert raw soil moisture to percentage
    const soilMoisturePercent = convertSoilMoisture(payload.soil_moisture);

    const sensorData = {
      device_id: payload.device_id || "ESP32_001",
      zone: payload.zone || "Zone A",
      soilMoisture: soilMoisturePercent,
      soilMoistureRaw: payload.soil_moisture,
      temperature: temperature,
      humidity: humidity,
      soilTemp: payload.soil_temp,
      pumpStatus: payload.pump_status || "OFF",
      timestamp: new Date(),
    };

    // --- CHECK FOR CRITICAL ALERTS ---
    const alerts = [];
    if (soilMoisturePercent < ALERT_THRESHOLDS.moistureLow) {
      alerts.push({
        type: "critical",
        title: "Low Soil Moisture",
        message: `Zone A moisture is critically low at ${soilMoisturePercent}%`,
        zone: "Zone A",
        value: soilMoisturePercent,
        threshold: ALERT_THRESHOLDS.moistureLow,
      });
    }
    if (soilMoisturePercent > ALERT_THRESHOLDS.moistureHigh) {
      alerts.push({
        type: "warning",
        title: "High Soil Moisture",
        message: `Zone A moisture is high at ${soilMoisturePercent}%`,
        zone: "Zone A",
        value: soilMoisturePercent,
        threshold: ALERT_THRESHOLDS.moistureHigh,
      });
    }
    if (payload.temperature > ALERT_THRESHOLDS.tempHigh) {
      alerts.push({
        type: "warning",
        title: "High Temperature",
        message: `Zone A temperature is ${payload.temperature}°C`,
        zone: "Zone A",
        value: payload.temperature,
        threshold: ALERT_THRESHOLDS.tempHigh,
      });
    }

    // --- SAVE TO DB ---
    const newData = new Data(sensorData);
    await newData.save();
    console.log("💾 Saved to MongoDB (Moisture: " + soilMoisturePercent + "%)");

    // Emit real-time data to all connected clients via Socket.IO
    if (global.io) {
      global.io.emit("sensorData", sensorData);
      
      // Emit alerts if any
      if (alerts.length > 0) {
        global.io.emit("alerts", alerts);
        console.log("⚠️ Alerts emitted:", alerts.length);
      }
      
      console.log("📤 Emitted to clients");
    }
  } catch (err) {
    console.error("❌ MQTT Processing Error:", err.message);
  }
});

// --- ERROR HANDLING ---
client.on("error", (err) => {
  console.error("❌ MQTT Error:", err.message);
});

client.on("reconnect", () => {
  console.log("🔄 Reconnecting to MQTT...");
});

client.on("offline", () => {
  console.log("⚠️ MQTT Offline");
});

// --- EXPORT ---
module.exports = client;
module.exports.publishPumpCommand = publishPumpCommand;
module.exports.client = client;