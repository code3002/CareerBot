const express = require("express");

const { buildCareerSnapshot } = require("../services/profileAnalyzer");

const router = express.Router();

router.post("/", (req, res) => {
  const { profileText, sourceType = "linkedin" } = req.body || {};

  if (!profileText || !String(profileText).trim()) {
    return res.status(400).json({
      error: "A profile summary or LinkedIn text is required."
    });
  }

  const resumeText = String(profileText).trim();
  const snapshot = buildCareerSnapshot(resumeText, sourceType);

  return res.json({ resumeText, snapshot });
});

module.exports = router;
