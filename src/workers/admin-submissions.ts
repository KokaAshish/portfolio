/**
 * D1 CRUD operations for contact_submissions
 *
 * Concurrency note (two simultaneous submissions):
 * D1 is backed by SQLite in WAL mode. Writes are serialized by SQLite's
 * write lock — two inserts at the same instant will succeed sequentially.
 * AUTOINCREMENT guarantees unique IDs. No data is lost, no IDs collide.
 */

export interface Submission {
  id:           number;
  name:         string;
  email:        string;
  message:      string;
  ip:           string | null;
  submitted_at: string;
  status:       'pending' | 'reviewed' | 'archived';
  notes:        string | null;
}

export type SubmissionStatus = 'pending' | 'reviewed' | 'archived';

export interface DB { DB: D1Database }

// ── Read ────────────────────────────────────────────────────────

export async function listSubmissions(
  env: DB,
  page     = 1,
  pageSize = 20,
  status?: SubmissionStatus
): Promise<{ submissions: Submission[]; total: number; page: number; pages: number }> {
  const offset = (page - 1) * pageSize;
  const where  = status ? 'WHERE status = ?' : '';
  const binds  = status ? [status] : [];

  const [rows, countRow] = await Promise.all([
    env.DB.prepare(
      `SELECT * FROM contact_submissions ${where} ORDER BY submitted_at DESC LIMIT ? OFFSET ?`
    ).bind(...binds, pageSize, offset).all<Submission>(),

    env.DB.prepare(
      `SELECT COUNT(*) as count FROM contact_submissions ${where}`
    ).bind(...binds).first<{ count: number }>(),
  ]);

  const total = countRow?.count ?? 0;
  return { submissions: rows.results, total, page, pages: Math.ceil(total / pageSize) };
}

// ── Write ───────────────────────────────────────────────────────

export async function saveSubmission(
  env: DB,
  data: { name: string; email: string; message: string; ip: string }
): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO contact_submissions (name, email, message, ip) VALUES (?, ?, ?, ?)`
  ).bind(data.name, data.email, data.message, data.ip).run();
  return result.meta.last_row_id as number;
}

// ── Update ──────────────────────────────────────────────────────

export async function updateStatus(
  env: DB,
  id:     number,
  status: SubmissionStatus
): Promise<boolean> {
  const result = await env.DB.prepare(
    `UPDATE contact_submissions SET status = ? WHERE id = ?`
  ).bind(status, id).run();
  return result.meta.changes > 0;
}
