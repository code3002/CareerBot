const express = require("express");

const { generateResponse, generateStreamResponse } = require("../services/geminiService");

const router = express.Router();

function compressForHistory(response) {
  if (response.type === "path_cards") {
    return JSON.stringify({
      type: "path_cards",
      paths: (response.paths || []).map((p) => ({
        title: p.title,
        best_for: p.best_for,
        risk_level: p.risk_level,
        timeline: p.timeline,
        salary_range: p.salary_range
      }))
    });
  }

  if (response.type === "action_plan") {
    return JSON.stringify({
      type: "action_plan",
      selected_path: response.selected_path,
      message: response.message
    });
  }

  return JSON.stringify(response);
}

function inferStage(response) {
  if (response.type === "action_plan") return "planning";
  if (response.type === "path_cards") return "paths";
  if (response.type === "closing") return "closed";
  return "clarifying";
}

function extractPreferenceSignals(message, currentSignals) {
  const nextSignals = { ...currentSignals };
  const normalized = String(message || "").toLowerCase();
  if (normalized.includes("salary")) nextSignals.salary_sensitive = true;
  if (normalized.includes("timeline")) nextSignals.timeline_sensitive = true;
  if (normalized.includes("industry")) nextSignals.industry_sensitive = true;
  if (normalized.includes("role")) nextSignals.role_sensitive = true;
  if (normalized.includes("stability")) nextSignals.prefers_stability = true;
  if (normalized.includes("upside")) nextSignals.prefers_upside = true;
  return nextSignals;
}

router.post("/", async (req, res) => {
  try {
    const {
      resumeText,
      conversationHistory = [],
      message,
      sourceType = "resume",
      snapshot = null,
      pathRound = 0,
      selectedPath = null,
      preferenceSignals = {}
    } = req.body || {};

    if (!resumeText || !message) {
      return res.status(400).json({ error: "resumeText and message are required." });
    }

    const response = await generateResponse(resumeText, conversationHistory, message, {
      sourceType, snapshot, pathRound, selectedPath, preferenceSignals
    });

    const nextPathRound = response.type === "path_cards" ? pathRound + 1 : pathRound;
    const nextSelectedPath = response.type === "action_plan" ? response.selected_path : selectedPath;
    const nextStage = inferStage(response);
    const nextPreferenceSignals = extractPreferenceSignals(message, preferenceSignals);
    const nextConversationHistory = [
      ...conversationHistory,
      { role: "user", content: message },
      { role: "assistant", content: compressForHistory(response) }
    ];

    return res.json({
      ...response,
      nextConversationHistory,
      meta: {
        stage: nextStage,
        pathRound: nextPathRound,
        selectedPath: nextSelectedPath,
        snapshot,
        preferenceSignals: nextPreferenceSignals
      }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      error: error.message || "Something went wrong while processing the chat request."
    });
  }
});

router.post("/stream", async (req, res) => {
  const {
    resumeText,
    conversationHistory = [],
    message,
    sourceType = "resume",
    snapshot = null,
    pathRound = 0,
    selectedPath = null,
    preferenceSignals = {}
  } = req.body || {};

  if (!resumeText || !message) {
    return res.status(400).json({ error: "resumeText and message are required." });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  function sendEvent(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    const gen = generateStreamResponse(resumeText, conversationHistory, message, {
      sourceType, snapshot, pathRound, selectedPath, preferenceSignals
    });

    let finalParsed = null;

    for await (const event of gen) {
      if (event.done) {
        finalParsed = event.parsed;
      } else {
        sendEvent({ token: event.token, accumulated: event.accumulated });
      }
    }

    if (!finalParsed) {
      sendEvent({
        done: true,
        response: { type: "message", message: "Something went wrong." },
        nextConversationHistory: conversationHistory,
        meta: {}
      });
      res.end();
      return;
    }

    const nextPathRound = finalParsed.type === "path_cards" ? pathRound + 1 : pathRound;
    const nextSelectedPath = finalParsed.type === "action_plan" ? finalParsed.selected_path : selectedPath;
    const nextStage = inferStage(finalParsed);
    const nextPreferenceSignals = extractPreferenceSignals(message, preferenceSignals);
    const nextConversationHistory = [
      ...conversationHistory,
      { role: "user", content: message },
      { role: "assistant", content: compressForHistory(finalParsed) }
    ];

    sendEvent({
      done: true,
      response: finalParsed,
      nextConversationHistory,
      meta: {
        stage: nextStage,
        pathRound: nextPathRound,
        selectedPath: nextSelectedPath,
        snapshot,
        preferenceSignals: nextPreferenceSignals
      }
    });
    res.end();
  } catch (error) {
    sendEvent({ done: true, error: error.message || "Streaming failed." });
    res.end();
  }
});

module.exports = router;
