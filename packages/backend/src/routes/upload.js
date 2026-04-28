const express = require("express");
const multer = require("multer");

const { parsePDF } = require("../services/pdfParser");
const { buildCareerSnapshot } = require("../services/profileAnalyzer");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
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

    try {
      const resumeText = await parsePDF(req.file.buffer);
      const snapshot = buildCareerSnapshot(resumeText, "resume");
      return res.json({ resumeText, snapshot });
    } catch (parseError) {
      return res.status(422).json({
        error: parseError.message || "Failed to parse the uploaded PDF."
      });
    }
  });
});

module.exports = router;
