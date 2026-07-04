/**
 * Admin authentication — server-side sessions backed by D1
 *
 * The cookie only carries a random, unguessable session id. All state
 * (validity, expiry) lives in the `admin_sessions` table, so:
 * - Logout actually revokes the session (DELETE the row) instead of just
 *   asking the browser to forget a still-valid token.
 * - A compromised cookie can be invalidated server-side at any time.
 */

export interface AdminEnv {
  DB?:             D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_USERNAME?: string;
}

const SESSION_MS  = 24 * 60 * 60 * 1000; // 24 hours
const COOKIE_NAME = 'admin_session';

// ── Session store (D1) ───────────────────────────────────────────

export async function createSession(
  env: AdminEnv,
  meta: { ip?: string; userAgent?: string } = {}
): Promise<string> {
  if (!env.DB) throw new Error('DB not configured.');

  const id        = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MS).toISOString();

  // Opportunistic cleanup — keeps the table from growing unbounded
  // (Workers have no background cron for this, so piggyback on login).
  await env.DB.prepare(`DELETE FROM admin_sessions WHERE expires_at < datetime('now')`).run();

  await env.DB.prepare(
    `INSERT INTO admin_sessions (id, ip, user_agent, expires_at) VALUES (?, ?, ?, ?)`
  ).bind(id, meta.ip ?? null, meta.userAgent ?? null, expiresAt).run();

  return id;
}

export async function validateSession(env: AdminEnv, id: string): Promise<boolean> {
  if (!env.DB || !id) return false;

  const row = await env.DB.prepare(
    `SELECT id FROM admin_sessions WHERE id = ? AND expires_at > datetime('now')`
  ).bind(id).first();

  return row !== null;
}

export async function deleteSession(env: AdminEnv, id: string): Promise<void> {
  if (!env.DB || !id) return;
  await env.DB.prepare(`DELETE FROM admin_sessions WHERE id = ?`).bind(id).run();
}

// ── Request authentication ──────────────────────────────────────

export function readSessionCookie(request: Request): string | null {
  const cookie = request.headers.get('Cookie') ?? '';
  const match  = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
}

export async function isAuthenticated(request: Request, env: AdminEnv): Promise<boolean> {
  const id = readSessionCookie(request);
  if (!id) return false;
  return validateSession(env, id);
}

// ── Cookie builders ─────────────────────────────────────────────

export async function makeSessionCookie(
  env: AdminEnv,
  meta: { ip?: string; userAgent?: string } = {}
): Promise<string> {
  const id = await createSession(env, meta);
  return `${COOKIE_NAME}=${id}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

// ── Credential checks (constant-time to prevent timing attacks) ──

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function verifyPassword(input: string, env: AdminEnv): boolean {
  const expected = env.ADMIN_PASSWORD ?? '';
  if (!expected) return false;
  return constantTimeEqual(input, expected);
}

export function verifyUsername(input: string, env: AdminEnv): boolean {
  const expected = env.ADMIN_USERNAME ?? 'admin';
  return constantTimeEqual(input, expected);
}

// Check both — always run both checks to avoid timing leaks
export function verifyCredentials(username: string, password: string, env: AdminEnv): boolean {
  const userOk = verifyUsername(username, env);
  const passOk = verifyPassword(password, env);
  return userOk && passOk;
}
