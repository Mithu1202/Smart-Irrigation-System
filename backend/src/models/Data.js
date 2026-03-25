const mongoose = require("mongoose");

const DataSchema = new mongoose.Schema({
  device_id: String,
  zone: String,
  soilMoisture: Number,
  temperature: Number,
  humidity: Number,
  pumpStatus: String,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Data", DataSchema);