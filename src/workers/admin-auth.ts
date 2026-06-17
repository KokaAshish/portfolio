/**
 * Admin authentication — stateless HMAC-SHA256 signed cookies
 *
 * Why signed cookies over sessions:
 * - No database round-trip on every request
 * - Workers are stateless; in-memory session maps reset on cold start
 * - HMAC signature is unforgeable without the secret
 * - Expiry is encoded in the payload — no server-side revocation needed
 *   (acceptable for a personal portfolio admin with 24h sessions)
 *
 * Token format: base64(payload).base64(hmac-sha256(ADMIN_SECRET, payload))
 * where payload = JSON({ exp: timestamp_ms })
 */

export interface AdminEnv {
  ADMIN_PASSWORD?: string;
  ADMIN_SECRET?:   string;
  ADMIN_USERNAME?: string;
}

const SESSION_MS  = 24 * 60 * 60 * 1000; // 24 hours
const COOKIE_NAME = 'admin_session';

// ── Crypto helpers ──────────────────────────────────────────────

async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function b64encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64decode(str: string): Uint8Array {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

// ── Token creation ──────────────────────────────────────────────

export async function createSessionToken(env: AdminEnv): Promise<string> {
  const secret = env.ADMIN_SECRET ?? 'fallback-change-this-in-production';
  const payload = JSON.stringify({ exp: Date.now() + SESSION_MS });
  const payloadB64 = btoa(payload);
  const key = await signingKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${b64encode(sig)}`;
}

// ── Token verification ──────────────────────────────────────────

export async function verifySessionToken(token: string, env: AdminEnv): Promise<boolean> {
  try {
    const secret = env.ADMIN_SECRET ?? 'fallback-change-this-in-production';
    const [payloadB64, sigB64] = token.split('.');
    if (!payloadB64 || !sigB64) return false;

    const key = await signingKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC', key, b64decode(sigB64), new TextEncoder().encode(payloadB64)
    );
    if (!valid) return false;

    const { exp } = JSON.parse(atob(payloadB64)) as { exp: number };
    return Date.now() < exp;
  } catch {
    return false;
  }
}

// ── Request authentication ──────────────────────────────────────

export async function isAuthenticated(request: Request, env: AdminEnv): Promise<boolean> {
  const cookie = request.headers.get('Cookie') ?? '';
  const match  = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match?.[1]) return false;
  return verifySessionToken(match[1], env);
}

// ── Cookie builders ─────────────────────────────────────────────

export async function makeSessionCookie(env: AdminEnv): Promise<string> {
  const token = await createSessionToken(env);
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}`;
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
