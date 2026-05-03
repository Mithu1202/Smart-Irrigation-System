const mqtt = require("mqtt");
const Data = require("../models/Data");

const host = "7744fd3022de42109b7bf3120b20c7a2.s1.eu.hivemq.cloud";
const port = "8883";
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;

const client = mqtt.connect(`mqtts://${host}:${port}`, {
  clientId,
  clean: true,
  username: process.env.MQTT_USERNAME || "mithu-iot",
  password: process.env.MQTT_PASSWORD || "Mithu@1202",
});

const recentReadings = [];
let lastSavedToDb = 0;
let lastGeoUpdate = 0;
let lastMLUpdate = 0;

const DB_SAVE_INTERVAL = 5 * 60 * 1000;      // 5 Minutes
const GEO_UPDATE_INTERVAL = 60 * 60 * 1000;  // 1 Hour
const ML_REFRESH_INTERVAL = 5 * 60 * 1000;   // 5 Minutes

client.on("connect", () => {
  console.log("✅ MQTT Connected (QoS 1 Ready)");
  client.subscribe("smart_irrigation/data", { qos: 1 });
});

const convertSoilMoisture = (raw) => {
  const DRY = 4095, WET = 1500;
  const clamped = Math.max(WET, Math.min(DRY, raw));
  return Math.round(((DRY - clamped) / (DRY - WET)) * 100);
};

client.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const soilPct = convertSoilMoisture(payload.soil_moisture || 4095);
    const last = recentReadings[recentReadings.length - 1];
    
    const sensorData = {
      device_id:         payload.device_id || "ESP32_001",
      zone:              payload.zone || "Zone A",
      soilMoisture:      soilPct,
      soilMoistureRaw:   payload.soil_moisture || 0,
      temperature:       payload.temperature || payload.air_temp || 0,
      humidity:          payload.humidity || 0,
      soilTemp:          payload.soil_temp || 0,
      waterFlowRate:     payload.water_flow_rate || 0,
      rainfall:          payload.rainfall || 0,
      lightIntensity:    payload.light_intensity || 0,
      evaporationRate:   payload.evaporation_rate || 0,
      batteryVoltage:    payload.battery_voltage || 0,
      rssi:              payload.rssi || 0,
      pumpStatus:        payload.pump_status || "OFF",
      mode:              payload.mode || "AUTO",
      prevMoisture:      last ? last.soilMoisture : soilPct,
      moistureChange:    last ? (soilPct - last.soilMoisture) : 0,
      timestamp:         new Date()
    };

    const now = Date.now();

    // 1. LIVE DATA: Dial updates (always send to dashboard)
    if (global.io) {
      global.io.emit("sensorData", sensorData);

      // 2. GEO UPDATE: Every 1 hour
      if (now - lastGeoUpdate > GEO_UPDATE_INTERVAL) {
        global.io.emit("geoUpdate", { zone: sensorData.zone, timestamp: now });
        lastGeoUpdate = now;
      }

      // 3. ML REFRESH: Every 5 minutes
      if (now - lastMLUpdate > ML_REFRESH_INTERVAL) {
        global.io.emit("mlRefresh", { zone: sensorData.zone });
        lastMLUpdate = now;
      }
    }

    // 4. STORAGE: Every 5 minutes
    if (now - lastSavedToDb > DB_SAVE_INTERVAL) {
      await new Data(sensorData).save();
      lastSavedToDb = now;
    }

    recentReadings.push(sensorData);
    if (recentReadings.length > 50) recentReadings.shift();

  } catch (err) {
    console.error("❌ MQTT Error:", err.message);
  }
});

// Add pump command publisher
client.publishPumpCommand = (deviceId, pumpActive) => {
  // Always publish to zone A control topic for now, matching the ESP32 subscription
  const topic = "smart_irrigation/control/A"; 
  const payload = JSON.stringify({
    command: pumpActive ? "ON" : "OFF",
    device_id: deviceId
  });
  
  client.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) {
      console.error("❌ MQTT Publish Error:", err);
    } else {
      console.log(`✅ MQTT Published to ${topic}: ${payload}`);
    }
  });
};

module.exports = client;
