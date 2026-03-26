const mongoose = require("mongoose");

const ZoneSchema = new mongoose.Schema({
  zoneId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, enum: ["Optimal", "Dry", "Wet"], default: "Optimal" },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  crop: { type: String, default: "Rice" },
  area: { type: String, default: "1.0 hct" },
  moistureThreshold: { type: Number, default: 40 },
  pumpActive: { type: Boolean, default: false },
  autoMode: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ZoneSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Zone", ZoneSchema);
