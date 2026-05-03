const mongoose = require("mongoose");

const DataSchema = new mongoose.Schema({
  device_id:    { type: String, default: "ESP32_001" },
  zone:         { type: String, default: "Zone A" },

  // Core sensors
  soilMoisture:      Number,   // converted %
  soilMoistureRaw:   Number,   // raw ADC
  temperature:       Number,
  humidity:          Number,
  soilTemp:          Number,
  waterFlowRate:     Number,
  rainfall:          Number,
  lightIntensity:    Number,
  evaporationRate:   Number,
  batteryVoltage:    Number,
  rssi:              Number,
  pumpStatus:        { type: String, enum: ["ON", "OFF"], default: "OFF" },
  mode:              { type: String, enum: ["AUTO", "MANUAL"], default: "AUTO" },

  // ML Lags
  moistureChange:    Number,
  prevMoisture:      Number,

  timestamp: { type: Date, default: Date.now },
});

// Ensure the index is created
DataSchema.index({ zone: 1, timestamp: -1 });

module.exports = mongoose.model("Data", DataSchema);
