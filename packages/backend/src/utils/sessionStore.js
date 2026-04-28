const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

const sessions = new Map();
const sessionTimeouts = new Map();

function clearSessionTimeout(sessionId) {
  const existingTimeout = sessionTimeouts.get(sessionId);

  if (existingTimeout) {
    clearTimeout(existingTimeout);
    sessionTimeouts.delete(sessionId);
  }
}

function scheduleSessionExpiry(sessionId) {
  clearSessionTimeout(sessionId);

  const timeout = setTimeout(() => {
    sessions.delete(sessionId);
    sessionTimeouts.delete(sessionId);
  }, SESSION_TTL_MS);

  sessionTimeouts.set(sessionId, timeout);
}

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

  sessions.set(sessionId, session);
  scheduleSessionExpiry(sessionId);

  return session;
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

function updateSession(sessionId, data) {
  const existingSession = sessions.get(sessionId);

  if (!existingSession) {
    return null;
  }

  const updatedSession = {
    ...existingSession,
    ...data,
    createdAt: data.createdAt ?? existingSession.createdAt
  };

  sessions.set(sessionId, updatedSession);
  scheduleSessionExpiry(sessionId);

  return updatedSession;
}

module.exports = {
  createSession,
  getSession,
  updateSession
};
