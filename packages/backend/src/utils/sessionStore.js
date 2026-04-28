const { Pool } = require("pg");

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const usePostgres = Boolean(process.env.DATABASE_URL);
const memorySessions = {};

let pool = null;
let initialized = false;

function buildDefaultSession(data) {
  return {
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
}

function getPoolConfig() {
  return {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  };
}

async function initializeSessionStore() {
  if (initialized) return;

  if (!usePostgres) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is required in production.");
    }

    console.warn("DATABASE_URL is not set. Falling back to in-memory sessions.");
    initialized = true;
    return;
  }

  pool = new Pool(getPoolConfig());

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);

  initialized = true;
}

async function createSession(sessionId, data) {
  const session = buildDefaultSession(data);

  if (!usePostgres) {
    memorySessions[sessionId] = session;
    return session;
  }

  await initializeSessionStore();
  await pool.query(
    `
      INSERT INTO sessions (id, data, created_at, updated_at)
      VALUES ($1, $2::jsonb, to_timestamp($3 / 1000.0), NOW())
      ON CONFLICT (id) DO UPDATE
      SET data = EXCLUDED.data,
          created_at = EXCLUDED.created_at,
          updated_at = NOW()
    `,
    [sessionId, JSON.stringify(session), session.createdAt]
  );

  return session;
}

async function getSession(sessionId) {
  if (!usePostgres) {
    const session = memorySessions[sessionId];
    if (!session) return null;

    if (Date.now() - session.createdAt > SESSION_TTL_MS) {
      delete memorySessions[sessionId];
      return null;
    }

    return session;
  }

  await initializeSessionStore();
  const result = await pool.query(
    `
      SELECT data, EXTRACT(EPOCH FROM created_at) * 1000 AS created_at_ms
      FROM sessions
      WHERE id = $1
    `,
    [sessionId]
  );

  if (result.rowCount === 0) return null;

  const row = result.rows[0];
  const createdAt = Number(row.created_at_ms);

  if (Date.now() - createdAt > SESSION_TTL_MS) {
    await pool.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
    return null;
  }

  return row.data;
}

async function updateSession(sessionId, data) {
  const existing = await getSession(sessionId);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...data,
    createdAt: data.createdAt ?? existing.createdAt
  };

  if (!usePostgres) {
    memorySessions[sessionId] = updated;
    return updated;
  }

  await pool.query(
    `
      UPDATE sessions
      SET data = $2::jsonb,
          updated_at = NOW()
      WHERE id = $1
    `,
    [sessionId, JSON.stringify(updated)]
  );

  return updated;
}

module.exports = {
  createSession,
  getSession,
  initializeSessionStore,
  updateSession
};
