const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

require("./mqtt/client");

const dataRoutes = require("./routes/dataRoutes");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use("/api/data", dataRoutes);

app.get("/", (req, res) => {
  res.send("Backend running");
});

module.exports = app;