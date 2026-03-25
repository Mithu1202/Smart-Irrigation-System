const express = require("express");
const router = express.Router();
const Data = require("../models/Data");

router.get("/latest", async (req, res) => {
  try {
    const data = await Data.find().sort({ timestamp: -1 }).limit(10);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;