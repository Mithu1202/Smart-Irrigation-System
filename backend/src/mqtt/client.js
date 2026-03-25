const mqtt = require("mqtt");
const Data = require("../models/Data");

const client = mqtt.connect(process.env.MQTT_URL, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

client.on("connect", () => {
  console.log("✅ MQTT Connected");

  client.subscribe("smart_irrigation/data", (err) => {
    if (err) {
      console.error("❌ Subscribe error:", err);
    } else {
      console.log("📡 Subscribed to topic");
    }
  });
});

client.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());

    console.log("📩 Incoming:", payload);

    await new Data({
      device_id: payload.device_id,
      zone: payload.zone || "Zone A",
      soilMoisture: payload.soil_moisture,
      temperature: payload.temperature,
      humidity: payload.humidity,
      pumpStatus: payload.pump_status || "OFF",
    }).save();

    console.log("💾 Saved to MongoDB");
  } catch (err) {
    console.error("❌ MQTT Processing Error:", err);
  }
});

client.on("error", (err) => {
  console.error("❌ MQTT Error:", err);
});

module.exports = client;