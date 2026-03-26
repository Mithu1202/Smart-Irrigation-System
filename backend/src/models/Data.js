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
});

module.exports = mongoose.model("Data", DataSchema);