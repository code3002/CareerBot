const express = require("express");

const { generateScorecard } = require("../services/geminiService");
const { getSession } = require("../utils/sessionStore");

const router = express.Router();

router.get("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required." });
  }

  const session = getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }

  try {
    const scorecard = await generateScorecard(session.resumeText, session.sourceType);
    return res.json({ scorecard });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to generate scorecard."
    });
  }
});

module.exports = router;
