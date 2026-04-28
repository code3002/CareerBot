const express = require("express");

const { generateResponse, generateStreamResponse } = require("../services/geminiService");
const { getSession, updateSession } = require("../utils/sessionStore");

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
  if (response.type === "action_plan") {
    return "planning";
  }

  if (response.type === "path_cards") {
    return "paths";
  }

  if (response.type === "closing") {
    return "closed";
  }

  return "clarifying";
}

function extractPreferenceSignals(message, currentSignals) {
  const nextSignals = { ...currentSignals };
  const normalized = String(message || "").toLowerCase();

  if (normalized.includes("salary")) {
    nextSignals.salary_sensitive = true;
  }

  if (normalized.includes("timeline")) {
    nextSignals.timeline_sensitive = true;
  }

  if (normalized.includes("industry")) {
    nextSignals.industry_sensitive = true;
  }

  if (normalized.includes("role")) {
    nextSignals.role_sensitive = true;
  }

  if (normalized.includes("stability")) {
    nextSignals.prefers_stability = true;
  }

  if (normalized.includes("upside")) {
    nextSignals.prefers_upside = true;
  }

  return nextSignals;
}

router.post("/", async (req, res) => {
  try {
    const { sessionId, message } = req.body || {};

    if (!sessionId || !message) {
      return res.status(400).json({
        error: "Both sessionId and message are required."
      });
    }

    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: "Session not found."
      });
    }

    const response = await generateResponse(
      session.resumeText,
      session.conversationHistory,
      message,
      {
        sourceType: session.sourceType,
        snapshot: session.snapshot,
        pathRound: session.pathRound,
        selectedPath: session.selectedPath,
        preferenceSignals: session.preferenceSignals
      }
    );

    const nextPathRound =
      response.type === "path_cards"
        ? (session.pathRound || 0) + 1
        : session.pathRound || 0;
    const nextSelectedPath =
      response.type === "action_plan" ? response.selected_path : session.selectedPath;
    const nextStage = inferStage(response);
    const preferenceSignals = extractPreferenceSignals(message, session.preferenceSignals);
    const events = [
      ...(session.events || []),
      { type: "user_message", at: Date.now(), message },
      { type: "assistant_response", at: Date.now(), responseType: response.type }
    ];

    const conversationHistory = [
      ...session.conversationHistory,
      { role: "user", content: message },
      { role: "assistant", content: compressForHistory(response) }
    ];

    await updateSession(sessionId, {
      conversationHistory,
      pathRound: nextPathRound,
      selectedPath: nextSelectedPath,
      stage: nextStage,
      preferenceSignals,
      events
    });

    return res.json({
      ...response,
      meta: {
        stage: nextStage,
        pathRound: nextPathRound,
        selectedPath: nextSelectedPath,
        snapshot: session.snapshot,
        preferenceSignals
      }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      error:
        error.message || "Something went wrong while processing the chat request."
    });
  }
});

router.post("/stream", async (req, res) => {
  const { sessionId, message } = req.body || {};

  if (!sessionId || !message) {
    return res.status(400).json({ error: "Both sessionId and message are required." });
  }

  let session;

  try {
    session = await getSession(sessionId);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Something went wrong while loading the session."
    });
  }

  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  function sendEvent(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    const gen = generateStreamResponse(
      session.resumeText,
      session.conversationHistory,
      message,
      {
        sourceType: session.sourceType,
        snapshot: session.snapshot,
        pathRound: session.pathRound,
        selectedPath: session.selectedPath,
        preferenceSignals: session.preferenceSignals
      }
    );

    let finalParsed = null;

    for await (const event of gen) {
      if (event.done) {
        finalParsed = event.parsed;
      } else {
        sendEvent({ token: event.token, accumulated: event.accumulated });
      }
    }

    if (!finalParsed) {
      sendEvent({ done: true, response: { type: "message", message: "Something went wrong." }, meta: {} });
      res.end();
      return;
    }

    const nextPathRound =
      finalParsed.type === "path_cards"
        ? (session.pathRound || 0) + 1
        : session.pathRound || 0;
    const nextSelectedPath =
      finalParsed.type === "action_plan" ? finalParsed.selected_path : session.selectedPath;
    const nextStage = inferStage(finalParsed);
    const preferenceSignals = extractPreferenceSignals(message, session.preferenceSignals);
    const events = [
      ...(session.events || []),
      { type: "user_message", at: Date.now(), message },
      { type: "assistant_response", at: Date.now(), responseType: finalParsed.type }
    ];
    const conversationHistory = [
      ...session.conversationHistory,
      { role: "user", content: message },
      { role: "assistant", content: compressForHistory(finalParsed) }
    ];

    await updateSession(sessionId, {
      conversationHistory,
      pathRound: nextPathRound,
      selectedPath: nextSelectedPath,
      stage: nextStage,
      preferenceSignals,
      events
    });

    const meta = {
      stage: nextStage,
      pathRound: nextPathRound,
      selectedPath: nextSelectedPath,
      snapshot: session.snapshot,
      preferenceSignals
    };

    sendEvent({ done: true, response: finalParsed, meta });
    res.end();
  } catch (error) {
    sendEvent({ done: true, error: error.message || "Streaming failed." });
    res.end();
  }
});

module.exports = router;
