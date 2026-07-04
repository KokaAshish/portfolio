-- Migration: 0002_admin_sessions
-- Created: 2026-07-05
-- Purpose: Server-side admin session store, so logout can actually
-- revoke a session instead of relying on a stateless signed cookie.

CREATE TABLE IF NOT EXISTS admin_sessions (
  id           TEXT PRIMARY KEY,             -- random session id (cookie value)

  -- Request metadata, useful for auditing active sessions
  ip           TEXT,                          -- CF-Connecting-IP, nullable
  user_agent   TEXT,

  -- Timestamps (UTC, ISO-8601)
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT NOT NULL
);

-- Session validation: look up by id, filter on expiry
CREATE INDEX IF NOT EXISTS idx_sessions_expires
  ON admin_sessions (expires_at);
