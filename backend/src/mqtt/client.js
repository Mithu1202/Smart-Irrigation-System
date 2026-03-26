require("dotenv").config();

const mqtt = require("mqtt");
const Data = require("../models/Data");

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

// --- ON MESSAGE ---
client.on("message", async (topic, message) => {
  if (topic !== "smart_irrigation/data") return;

  try {
    const payload = JSON.parse(message.toString());

    console.log("📩 Incoming:", payload);

    // --- BASIC VALIDATION ---
    if (!payload.soil_moisture || !payload.temperature || !payload.humidity) {
      console.warn("⚠️ Invalid payload, skipping...");
      return;
    }

    // --- SAVE TO DB ---
    const newData = new Data({
      device_id: payload.device_id || "ESP32_001",
      zone: payload.zone || "Zone A",
      soilMoisture: payload.soil_moisture,
      temperature: payload.temperature,
      humidity: payload.humidity,
      pumpStatus: payload.pump_status || "OFF",
      timestamp: new Date(),
    });

    await newData.save();

    console.log("💾 Saved to MongoDB");
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