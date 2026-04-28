const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const { parsePDF } = require("../services/pdfParser");
const { buildCareerSnapshot } = require("../services/profileAnalyzer");
const { createSession } = require("../utils/sessionStore");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      const error = new Error("Only PDF files are allowed.");
      error.code = "INVALID_FILE_TYPE";
      return cb(error);
    }

    cb(null, true);
  }
});

router.post("/", (req, res, next) => {
  upload.single("resume")(req, res, async (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File too large. Maximum size is 5MB." });
      }

      if (error.code === "INVALID_FILE_TYPE") {
        return res.status(400).json({ error: "Only PDF files are allowed." });
      }

      return next(error);
    }

    if (!req.file) {
      return res.status(400).json({ error: "No resume file was uploaded." });
    }

    let resumeText;

    try {
      resumeText = await parsePDF(req.file.buffer);
    } catch (parseError) {
      return res.status(422).json({
        error: parseError.message || "Failed to parse the uploaded PDF."
      });
    }

    try {
      const sessionId = uuidv4();
      const snapshot = buildCareerSnapshot(resumeText, "resume");

      await createSession(sessionId, {
        resumeText,
        sourceType: "resume",
        conversationHistory: [],
        snapshot,
        selectedPath: null,
        pathRound: 0,
        stage: "analyzed",
        preferenceSignals: {},
        events: [
          {
            type: "resume_uploaded",
            at: Date.now(),
            sourceType: "resume"
          }
        ]
      });

      return res.json({
        sessionId,
        success: true,
        snapshot
      });
    } catch (error) {
      return next(error);
    }
  });
});

module.exports = router;
