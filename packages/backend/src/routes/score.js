const express = require("express");

const { generateScorecard } = require("../services/geminiService");

const router = express.Router();

router.post("/", async (req, res) => {
  const { resumeText, sourceType = "resume" } = req.body || {};

  if (!resumeText) {
    return res.status(400).json({ error: "resumeText is required." });
  }

  try {
    const scorecard = await generateScorecard(resumeText, sourceType);
    return res.json({ scorecard });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to generate scorecard."
    });
  }
});

module.exports = router;
