const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });
const Data = require("./backend/src/models/Data");

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/smart-irrigation");
    console.log("Connected to MongoDB");
    
    const latest = await Data.find().sort({ timestamp: -1 }).limit(5);
    if (latest.length === 0) {
      console.log("No data found in MongoDB.");
    } else {
      console.log("Latest 5 records:");
      latest.forEach(d => {
        console.log(`[${d.timestamp.toISOString()}] Soil: ${d.soilMoistureRaw} (${d.soilMoisture}%) | Pump: ${d.pumpStatus}`);
      });
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
