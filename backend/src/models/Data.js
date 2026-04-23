const mongoose = require("mongoose");

const DataSchema = new mongoose.Schema({
  device_id: String,
  zone: String,
  soilMoisture: Number,
  soilMoistureRaw: Number,
  temperature: Number,
  humidity: Number,
  soilTemp: Number,
  pumpStatus: String,
  timestamp: { type: Date, default: Date.now },
  thresholdGap: Number,
  moistureTrend: Number,
  avgMoisture_24h: Number,
  riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH"] },
  irrigationNeed: Boolean,
  timeOfDay: String,
  temperatureDelta: Number,
  humidityDelta: Number,
  moistureVolatility: Number,
  waterStressIndex: Number,
  recentIrrigationCount: Number,
  enrichmentSource: String,
  enrichedAt: Date,
});

DataSchema.index({ zone: 1, timestamp: -1 });

module.exports = mongoose.model("Data", DataSchema);
