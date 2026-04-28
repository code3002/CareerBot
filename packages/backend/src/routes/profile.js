const express = require("express");
const { v4: uuidv4 } = require("uuid");

const { buildCareerSnapshot } = require("../services/profileAnalyzer");
const { createSession } = require("../utils/sessionStore");

const router = express.Router();

router.post("/", async (req, res, next) => {
  const { profileText, sourceType = "linkedin" } = req.body || {};

  if (!profileText || !String(profileText).trim()) {
    return res.status(400).json({
      error: "A profile summary or LinkedIn text is required."
    });
  }

  const sessionId = uuidv4();
  const cleanedText = String(profileText).trim();
  const snapshot = buildCareerSnapshot(cleanedText, sourceType);

  try {
    await createSession(sessionId, {
      resumeText: cleanedText,
      sourceType,
      conversationHistory: [],
      snapshot,
      selectedPath: null,
      pathRound: 0,
      stage: "analyzed",
      preferenceSignals: {},
      events: [
        {
          type: "profile_created",
          at: Date.now(),
          sourceType
        }
      ]
    });
  } catch (error) {
    return next(error);
  }

  return res.json({
    success: true,
    sessionId,
    snapshot
  });
});

module.exports = router;
