-- Migration: 0001_contact_submissions
-- Created: 2025-06-14
-- Purpose: Store contact form submissions for admin moderation

CREATE TABLE IF NOT EXISTS contact_submissions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Sender info — validated at both client and server
  name         TEXT NOT NULL
                    CHECK(length(trim(name))    >= 2  AND length(name)    <= 100),
  email        TEXT NOT NULL
                    CHECK(email LIKE '%@%.%'          AND length(email)   <= 254),
  message      TEXT NOT NULL
                    CHECK(length(trim(message)) >= 10 AND length(message) <= 2000),

  -- Request metadata
  ip           TEXT,                          -- CF-Connecting-IP, nullable

  -- Timestamps (UTC, ISO-8601)
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- Moderation workflow
  status       TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending', 'reviewed', 'archived')),
  notes        TEXT CHECK(notes IS NULL OR length(notes) <= 1000)
);

-- Admin list: filter by status
CREATE INDEX IF NOT EXISTS idx_submissions_status
  ON contact_submissions (status);

-- Admin list: sort by newest first
CREATE INDEX IF NOT EXISTS idx_submissions_date
  ON contact_submissions (submitted_at DESC);
