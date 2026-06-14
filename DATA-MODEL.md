# Data Model — Ashish Koka Portfolio

## Table: `contact_submissions`

Stores every validated contact form submission for admin moderation.

```sql
CREATE TABLE contact_submissions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL CHECK(length(trim(name))    >= 2   AND length(name)    <= 100),
  email        TEXT    NOT NULL CHECK(email LIKE '%@%.%'           AND length(email)   <= 254),
  message      TEXT    NOT NULL CHECK(length(trim(message)) >= 10  AND length(message) <= 2000),
  ip           TEXT,
  submitted_at TEXT    NOT NULL DEFAULT (datetime('now')),
  status       TEXT    NOT NULL DEFAULT 'pending'
                       CHECK(status IN ('pending', 'reviewed', 'archived')),
  notes        TEXT    CHECK(notes IS NULL OR length(notes) <= 1000)
);
```

### Field rationale

| Field | Type | Constraint | Why |
|---|---|---|---|
| `id` | INTEGER PK | AUTOINCREMENT | Unique, ordered, never reused |
| `name` | TEXT | 2–100 chars | Minimum meaningful, max prevents abuse |
| `email` | TEXT | RFC-like pattern, ≤254 | 254 is the RFC 5321 max |
| `message` | TEXT | 10–2000 chars | Minimum meaningful, max prevents storage abuse |
| `ip` | TEXT | Nullable | Stored for abuse tracking; nullable because CF header may be absent |
| `submitted_at` | TEXT | ISO-8601 UTC | SQLite has no native DATETIME type; TEXT is sortable |
| `status` | TEXT | enum check | Explicit moderation states, constrained by DB not just app |
| `notes` | TEXT | Nullable, ≤1000 | Future: admin annotations per submission |

### Status lifecycle

```
pending → reviewed   (admin has read it)
pending → archived   (spam or irrelevant)
reviewed → archived  (done with it)
archived → pending   (restore if wrongly archived)
```

### Validation layers

| Check | Where |
|---|---|
| Required fields, min/max length | Client JS (UX) |
| Same checks + HTML tag stripping | Server (Workers handler) — client checks are bypassed by curl |
| Column-level constraints | SQLite CHECK constraints — last line of defence |

### Concurrency

D1 uses SQLite in WAL (Write-Ahead Logging) mode. Two simultaneous inserts are serialized by SQLite's write lock — both succeed sequentially. `AUTOINCREMENT` guarantees unique IDs. No data is lost, no IDs collide, no application-level locking is needed.

### Indexes

```sql
CREATE INDEX idx_submissions_status       ON contact_submissions (status);
CREATE INDEX idx_submissions_submitted_at ON contact_submissions (submitted_at DESC);
```

The admin list always filters by status and/or sorts by date — both are indexed.

### What changes at 10,000 entries

- Add pagination (already implemented — 20 per page)
- Add full-text search on name/email/message (SQLite FTS5)
- Consider archiving rows older than 90 days to a separate cold table
- Export to CSV/JSON for bulk analysis
