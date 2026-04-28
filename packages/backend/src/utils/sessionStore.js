const fs = require("fs");

const SESSIONS_FILE = "/tmp/careerbot-sessions.json";
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

function loadFromDisk() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return {};
    const raw = fs.readFileSync(SESSIONS_FILE, "utf8");
    const all = JSON.parse(raw);
    const now = Date.now();
    const valid = {};
    for (const [id, session] of Object.entries(all)) {
      if (now - session.createdAt < SESSION_TTL_MS) {
        valid[id] = session;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

function saveToDisk(sessions) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions), "utf8");
  } catch {
    // disk errors are non-fatal — sessions still work in memory
  }
}

const sessions = loadFromDisk();

function createSession(sessionId, data) {
  const session = {
    resumeText: "",
    sourceType: "resume",
    conversationHistory: [],
    createdAt: Date.now(),
    snapshot: null,
    selectedPath: null,
    pathRound: 0,
    stage: "analyzed",
    preferenceSignals: {},
    events: [],
    ...data
  };

  sessions[sessionId] = session;
  saveToDisk(sessions);
  return session;
}

function getSession(sessionId) {
  const session = sessions[sessionId];
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    delete sessions[sessionId];
    saveToDisk(sessions);
    return null;
  }
  return session;
}

function updateSession(sessionId, data) {
  const existing = sessions[sessionId];
  if (!existing) return null;

  const updated = {
    ...existing,
    ...data,
    createdAt: data.createdAt ?? existing.createdAt
  };

  sessions[sessionId] = updated;
  saveToDisk(sessions);
  return updated;
}

module.exports = { createSession, getSession, updateSession };
