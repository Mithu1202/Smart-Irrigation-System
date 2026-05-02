const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { getOpenRouterStatus } = require("./ai/openrouter");
const { getRetrieverStatus } = require("./rag/retriever");

require("./mqtt/client");

const dataRoutes = require("./routes/dataRoutes");
const zoneRoutes = require("./routes/zoneRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const agentRoutes = require("./routes/agentRoutes");
const authRoutes = require("./routes/authRoutes");
const mlRoutes    = require("./routes/mlRoutes");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use("/api/data", dataRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ml",   mlRoutes);

app.get("/", (req, res) => {
  res.send("Backend running");
});

app.get("/api/health", (req, res) => {
  res.json({
    mongo: {
      connected: mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
    },
    openRouter: getOpenRouterStatus(),
    retriever: getRetrieverStatus(),
  });
});

module.exports = app;
