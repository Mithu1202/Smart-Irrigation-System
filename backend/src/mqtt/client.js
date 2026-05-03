const mqtt = require("mqtt");
const Data = require("../models/Data");

// HiveMQ Cloud Config
const host = "7744fd3022de42109b7bf3120b20c7a2.s1.eu.hivemq.cloud";
const port = "8883";
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;

const client = mqtt.connect(`mqtts://${host}:${port}`, {
  clientId,
  clean: true,
  connectTimeout: 4000,
  username: process.env.MQTT_USERNAME || "mithu-iot",
  password: process.env.MQTT_PASSWORD || "Mithu@1202",
  reconnectPeriod: 1000,
});

const recentReadings = [];

client.on("connect", () => {
  console.log("✅ MQTT Connected to HiveMQ Cloud");
  client.subscribe("smart_irrigation/data");
});

// Calibration
const DRY_VALUE = 4095;
const WET_VALUE = 1500;
const convertSoilMoisture = (raw) => {
  const clamped = Math.max(WET_VALUE, Math.min(DRY_VALUE, raw));
  return Math.round(((DRY_VALUE - clamped) / (DRY_VALUE - WET_VALUE)) * 100);
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

    // SAVE TO MONGODB
    const newData = new Data(sensorData);
    await newData.save();
    
    console.log(`💾 Saved to DB | Soil: ${soilPct}% | Pump: ${sensorData.pumpStatus}`);

    recentReadings.push(sensorData);
    if (recentReadings.length > 10) recentReadings.shift();

    if (global.io) {
      global.io.emit("sensorData", sensorData);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
});

module.exports = client;
