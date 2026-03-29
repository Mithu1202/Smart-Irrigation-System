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

// ==================== REPORTS API ====================

// Get weekly moisture trend data (supports ?zone= filter or returns all zones)
router.get("/reports/weekly-trend", async (req, res) => {
  try {
    const days = 7;
    const zoneFilter = req.query.zone;
    
    // Get all zones for zone-wise report
    const zones = await Zone.find().sort({ zoneId: 1 });
    
    if (zoneFilter) {
      // Single zone trend
      const trends = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dayData = await Data.find({
          zone: zoneFilter,
          timestamp: { $gte: date, $lt: nextDate }
        });
        
        const avgMoisture = dayData.length > 0 
          ? Math.round(dayData.reduce((sum, d) => sum + (d.soilMoisture || 0), 0) / dayData.length)
          : null;
        
        trends.push({
          day: date.toLocaleDateString("en-US", { weekday: "short" }),
          date: date.toISOString().split("T")[0],
          moisture: avgMoisture,
          readings: dayData.length,
        });
      }
      
      const validMoisture = trends.filter(t => t.moisture !== null).map(t => t.moisture);
      const stats = {
        avg: validMoisture.length > 0 ? Math.round(validMoisture.reduce((a, b) => a + b, 0) / validMoisture.length) : 0,
        max: validMoisture.length > 0 ? Math.max(...validMoisture) : 0,
        min: validMoisture.length > 0 ? Math.min(...validMoisture) : 0,
      };
      
      return res.json({ trends, stats, zone: zoneFilter });
    }
    
    // All zones - return zone-wise data
    const zoneData = await Promise.all(zones.map(async (zone) => {
      const trends = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dayData = await Data.find({
          zone: zone.name,
          timestamp: { $gte: date, $lt: nextDate }
        });
        
        const avgMoisture = dayData.length > 0 
          ? Math.round(dayData.reduce((sum, d) => sum + (d.soilMoisture || 0), 0) / dayData.length)
          : null;
        
        trends.push({
          day: date.toLocaleDateString("en-US", { weekday: "short" }),
          moisture: avgMoisture,
        });
      }
      
      const validMoisture = trends.filter(t => t.moisture !== null).map(t => t.moisture);
      
      return {
        zone: zone.name,
        zoneId: zone.zoneId,
        trends,
        stats: {
          avg: validMoisture.length > 0 ? Math.round(validMoisture.reduce((a, b) => a + b, 0) / validMoisture.length) : 0,
          max: validMoisture.length > 0 ? Math.max(...validMoisture) : 0,
          min: validMoisture.length > 0 ? Math.min(...validMoisture) : 0,
        }
      };
    }));
    
    res.json({ zones: zoneData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get irrigation history (pump events) - supports ?zone= filter
router.get("/reports/irrigation-history", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    // Get data where pump status changed or was active
    const history = await Data.find({
      pumpStatus: { $exists: true }
    })
      .sort({ timestamp: -1 })
      .limit(limit * 2); // Get more to find transitions
    
    // Find pump state transitions
    const events = [];
    let lastPumpState = null;
    
    for (let i = history.length - 1; i >= 0; i--) {
      const current = history[i];
      const currentState = current.pumpStatus === "ON";
      
      if (lastPumpState !== null && lastPumpState !== currentState) {
        events.push({
          type: currentState ? "start" : "stop",
          timestamp: current.timestamp,
          zone: current.zone || "Zone A",
          moisture: current.soilMoisture,
          temperature: current.temperature,
          trigger: currentState 
            ? (current.soilMoisture < 30 ? "auto_low_moisture" : "manual")
            : "manual",
        });
      }
      lastPumpState = currentState;
    }
    
    // Get total water usage estimate (based on pump ON duration)
    const pumpOnReadings = history.filter(h => h.pumpStatus === "ON").length;
    const estimatedWaterUsage = pumpOnReadings * 2; // ~2 liters per reading interval
    
    res.json({
      events: events.reverse().slice(0, limit),
      totalEvents: events.length,
      estimatedWaterUsage,
      pumpOnTime: pumpOnReadings * 2, // minutes (assuming 2 min intervals)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get alerts history
router.get("/reports/alerts", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const thresholds = {
      moistureLow: 25,
      moistureHigh: 80,
      tempHigh: 35,
    };
    
    // Get recent data to find alert conditions
    const recentData = await Data.find()
      .sort({ timestamp: -1 })
      .limit(limit * 3);
    
    const alerts = [];
    
    recentData.forEach(data => {
      if (data.soilMoisture < thresholds.moistureLow) {
        alerts.push({
          type: "critical",
          title: "Low Soil Moisture",
          message: `Moisture dropped to ${data.soilMoisture}%`,
          zone: data.zone || "Zone A",
          value: data.soilMoisture,
          threshold: thresholds.moistureLow,
          timestamp: data.timestamp,
        });
      }
      if (data.soilMoisture > thresholds.moistureHigh) {
        alerts.push({
          type: "warning",
          title: "High Soil Moisture",
          message: `Moisture reached ${data.soilMoisture}%`,
          zone: data.zone || "Zone A",
          value: data.soilMoisture,
          threshold: thresholds.moistureHigh,
          timestamp: data.timestamp,
        });
      }
      if (data.temperature > thresholds.tempHigh) {
        alerts.push({
          type: "warning",
          title: "High Temperature",
          message: `Temperature reached ${data.temperature}°C`,
          zone: data.zone || "Zone A",
          value: data.temperature,
          threshold: thresholds.tempHigh,
          timestamp: data.timestamp,
        });
      }
    });
    
    // Remove duplicates within 5 minute windows
    const uniqueAlerts = [];
    alerts.forEach(alert => {
      const isDuplicate = uniqueAlerts.some(existing => 
        existing.type === alert.type && 
        existing.title === alert.title &&
        Math.abs(new Date(existing.timestamp) - new Date(alert.timestamp)) < 5 * 60 * 1000
      );
      if (!isDuplicate) {
        uniqueAlerts.push(alert);
      }
    });
    
    res.json({
      alerts: uniqueAlerts.slice(0, limit),
      total: uniqueAlerts.length,
      summary: {
        critical: uniqueAlerts.filter(a => a.type === "critical").length,
        warning: uniqueAlerts.filter(a => a.type === "warning").length,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get overall system stats for reports
router.get("/reports/stats", async (req, res) => {
  try {
    const zones = await Zone.find();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentData = await Data.find({ timestamp: { $gte: last24h } });
    
    // Calculate averages
    const avgMoisture = recentData.length > 0
      ? Math.round(recentData.reduce((sum, d) => sum + (d.soilMoisture || 0), 0) / recentData.length)
      : 0;
    const avgTemp = recentData.length > 0
      ? Math.round(recentData.reduce((sum, d) => sum + (d.temperature || 0), 0) / recentData.length * 10) / 10
      : 0;
    const avgHumidity = recentData.length > 0
      ? Math.round(recentData.reduce((sum, d) => sum + (d.humidity || 0), 0) / recentData.length)
      : 0;
    
    // Pump stats
    const pumpOnCount = recentData.filter(d => d.pumpStatus === "ON").length;
    const totalReadings = recentData.length;
    const pumpOnPercentage = totalReadings > 0 ? Math.round((pumpOnCount / totalReadings) * 100) : 0;
    
    // Water savings estimate (compared to always-on irrigation)
    const estimatedSavings = 100 - pumpOnPercentage;
    
    res.json({
      zones: {
        total: zones.length,
        active: zones.filter(z => z.pumpActive).length,
      },
      last24h: {
        readings: totalReadings,
        avgMoisture,
        avgTemp,
        avgHumidity,
        pumpOnTime: pumpOnCount * 2, // minutes
        pumpOnPercentage,
      },
      savings: {
        waterSaved: estimatedSavings,
        estimatedLiters: Math.round((estimatedSavings / 100) * 200), // 200L baseline
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
