const express = require("express");
const { runAgentQuery } = require("../ai/agent");
const { getOpenRouterStatus } = require("../ai/openrouter");
const { getRetrieverStatus } = require("../rag/retriever");

const router = express.Router();

router.post("/query", async (req, res) => {
  try {
    const { question, zone, systemCost, costPerLiter, litersPerReading } = req.body || {};

    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: "question is required" });
    }

    const result = await runAgentQuery(question, {
      zone,
      systemCost,
      costPerLiter,
      litersPerReading,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/status", async (req, res) => {
  res.json({
    openRouter: getOpenRouterStatus(),
    retriever: getRetrieverStatus(),
  });
});

module.exports = router;
