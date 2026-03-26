const express = require("express");
const router = express.Router();
const Zone = require("../models/Zone");
const Data = require("../models/Data");

// Lazy load MQTT client to avoid circular dependency
let mqttClient = null;
const getMqttClient = () => {
  if (!mqttClient) {
    mqttClient = require("../mqtt/client");
  }
  return mqttClient;
};

// Get all zones with latest sensor data
router.get("/", async (req, res) => {
  try {
    const zones = await Zone.find().sort({ zoneId: 1 });
    
    // Enrich zones with latest sensor data
    const enrichedZones = await Promise.all(
      zones.map(async (zone) => {
        const latestData = await Data.findOne({ zone: zone.name })
          .sort({ timestamp: -1 })
          .limit(1);
        
        return {
          ...zone.toObject(),
          soilMoisture: latestData?.soilMoisture || 0,
          temperature: latestData?.temperature || 0,
          humidity: latestData?.humidity || 0,
          lastUpdate: latestData?.timestamp || null,
        };
      })
    );
    
    res.json(enrichedZones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get historical chart data for a zone
router.get("/:id/history", async (req, res) => {
  try {
    const zone = await Zone.findOne({ zoneId: req.params.id });
    if (!zone) {
      return res.status(404).json({ error: "Zone not found" });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const history = await Data.find({ zone: zone.name })
      .sort({ timestamp: -1 })
      .limit(limit);
    
    // Format data for charts
    const chartData = history.reverse().map(d => ({
      time: new Date(d.timestamp).toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: false 
      }),
      moisture: d.soilMoisture || 0,
      temperature: d.temperature || 0,
      humidity: d.humidity || 0,
      soilTemp: d.soilTemp || 0,
    }));
    
    res.json(chartData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single zone by ID
router.get("/:id", async (req, res) => {
  try {
    const zone = await Zone.findOne({ zoneId: req.params.id });
    if (!zone) {
      return res.status(404).json({ error: "Zone not found" });
    }
    
    const latestData = await Data.findOne({ zone: zone.name })
      .sort({ timestamp: -1 })
      .limit(1);
    
    const history = await Data.find({ zone: zone.name })
      .sort({ timestamp: -1 })
      .limit(50);
    
    res.json({
      ...zone.toObject(),
      soilMoisture: latestData?.soilMoisture || 0,
      temperature: latestData?.temperature || 0,
      humidity: latestData?.humidity || 0,
      lastUpdate: latestData?.timestamp || null,
      history,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new zone
router.post("/", async (req, res) => {
  try {
    const zone = new Zone(req.body);
    await zone.save();
    res.status(201).json(zone);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update zone
router.put("/:id", async (req, res) => {
  try {
    const zone = await Zone.findOneAndUpdate(
      { zoneId: req.params.id },
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!zone) {
      return res.status(404).json({ error: "Zone not found" });
    }
    res.json(zone);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete zone
router.delete("/:id", async (req, res) => {
  try {
    const zone = await Zone.findOneAndDelete({ zoneId: req.params.id });
    if (!zone) {
      return res.status(404).json({ error: "Zone not found" });
    }
    res.json({ message: "Zone deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle pump for a zone
router.post("/:id/pump", async (req, res) => {
  try {
    const zoneId = req.params.id;
    console.log("Toggle pump for zone:", zoneId);
    
    const zone = await Zone.findOne({ zoneId: zoneId });
    if (!zone) {
      console.log("Zone not found:", zoneId);
      return res.status(404).json({ error: "Zone not found" });
    }
    
    const newPumpState = req.body.pumpActive !== undefined ? req.body.pumpActive : !zone.pumpActive;
    
    await Zone.updateOne(
      { zoneId: zoneId },
      { $set: { pumpActive: newPumpState, updatedAt: new Date() } }
    );
    
    // Send MQTT command to ESP32 to control the pump
    try {
      const mqtt = getMqttClient();
      if (mqtt && mqtt.publishPumpCommand) {
        const deviceId = zoneId === "A" ? "ESP32_001" : `ESP32_${zoneId}`;
        mqtt.publishPumpCommand(deviceId, newPumpState);
      }
    } catch (mqttErr) {
      console.warn("MQTT publish failed:", mqttErr.message);
    }
    
    // Emit pump status change via Socket.IO
    if (global.io) {
      global.io.emit("pumpStatus", { 
        zoneId: zoneId, 
        pumpActive: newPumpState 
      });
    }
    
    console.log(`Pump ${newPumpState ? "ON" : "OFF"} for ${zone.name}`);
    
    res.json({ 
      zoneId: zone.zoneId, 
      pumpActive: newPumpState,
      message: `Pump ${newPumpState ? "activated" : "deactivated"} for ${zone.name}`
    });
  } catch (err) {
    console.error("Pump toggle error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Seed default zones (useful for initial setup - customize coordinates for your farm)
router.post("/seed", async (req, res) => {
  try {
    // Use provided zones from request body, or create empty placeholder zones
    const providedZones = req.body.zones;
    
    if (providedZones && Array.isArray(providedZones)) {
      // Use zones provided in request body
      for (const zoneData of providedZones) {
        await Zone.findOneAndUpdate(
          { zoneId: zoneData.zoneId },
          zoneData,
          { upsert: true, new: true }
        );
      }
      res.json({ message: "Zones seeded from request", count: providedZones.length });
    } else {
      // Create placeholder zones without coordinates - user must set real coordinates
      const placeholderZones = [
        { zoneId: "A", name: "Zone A", coordinates: { lat: 0, lng: 0 }, crop: "Not Set", area: "0 hct", moistureThreshold: 40 },
        { zoneId: "B", name: "Zone B", coordinates: { lat: 0, lng: 0 }, crop: "Not Set", area: "0 hct", moistureThreshold: 40 },
        { zoneId: "C", name: "Zone C", coordinates: { lat: 0, lng: 0 }, crop: "Not Set", area: "0 hct", moistureThreshold: 40 },
      ];
      
      for (const zoneData of placeholderZones) {
        await Zone.findOneAndUpdate(
          { zoneId: zoneData.zoneId },
          zoneData,
          { upsert: true, new: true }
        );
      }
      
      res.json({ 
        message: "Placeholder zones created. Update coordinates via PUT /api/zones/:id", 
        count: placeholderZones.length 
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
