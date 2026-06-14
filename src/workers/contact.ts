/**
 * Contact form Worker handler
 * Route: POST /api/contact
 *
 * Flow:
 * 1. Rate-limit by IP
 * 2. Validate input server-side
 * 3. Save to D1 (persists regardless of email outcome)
 * 4. Send email via MailChannels
 */

import { saveSubmission } from './admin-submissions';

export interface ContactPayload {
  name:    string;
  email:   string;
  message: string;
}

export interface ContactResult {
  ok:     boolean;
  error?: string;
}

export interface ContactEnv {
  TO_EMAIL?: string;
  DB?:       D1Database;
}

// ── Validation ────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Strip HTML/script tags to prevent stored XSS
function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

export function validatePayload(body: unknown): ContactResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Invalid request body.' };
  }
  const { name, email, message } = body as Record<string, unknown>;

  if (typeof name    !== 'string' || name.trim().length    < 2)   return { ok: false, error: 'Name must be at least 2 characters.'        };
  if (typeof name    !== 'string' || name.length           > 100)  return { ok: false, error: 'Name must be under 100 characters.'         };
  if (typeof email   !== 'string' || !EMAIL_RE.test(email))        return { ok: false, error: 'A valid email address is required.'         };
  if (typeof message !== 'string' || message.trim().length < 10)   return { ok: false, error: 'Message must be at least 10 characters.'    };
  if (typeof message !== 'string' || message.length        > 2000) return { ok: false, error: 'Message must be under 2000 characters.'     };

  // Reject HTML/script injection
  if (stripTags(name) !== name || stripTags(message) !== message) {
    return { ok: false, error: 'HTML tags are not allowed.' };
  }

  return { ok: true };
}

// ── In-memory rate limiter (resets on Worker restart) ─────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT   = 3;
const RATE_WINDOW  = 60 * 1000;

export function isRateLimited(ip: string): boolean {
  const now   = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ── Main handler ──────────────────────────────────────────────

export async function handleContact(
  request: Request,
  env: ContactEnv
): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (isRateLimited(ip)) {
    return json({ ok: false, error: 'Too many requests. Please try again shortly.' }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Could not parse request body.' }, 400);
  }

  const validation = validatePayload(body);
  if (!validation.ok) return json(validation, 400);

  const { name, email, message } = body as ContactPayload;
  const toEmail = env.TO_EMAIL ?? 'ashishkoka423@gmail.com';

  // ── 1. Persist to D1 (best-effort, non-blocking on error) ──
  if (env.DB) {
    try {
      await saveSubmission(env, { name, email, message, ip });
    } catch (err) {
      console.error('D1 save error', err);
      // Continue — don't block the user if DB is unreachable
    }
  }

  // ── 2. Send email via MailChannels ──────────────────────────
  try {
    const mailRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail, name: 'Ashish Koka' }] }],
        from:    { email, name },
        subject: `Portfolio contact from ${name}`,
        content: [{ type: 'text/plain', value: `Name:    ${name}\nEmail:   ${email}\n\n${message}` }],
      }),
    });

    if (!mailRes.ok && mailRes.status !== 202) {
      console.error('MailChannels error', mailRes.status, await mailRes.text());
      // Submission is already saved to D1 — tell the user it went through
    }
  } catch (err) {
    console.error('MailChannels fetch error', err);
  }

  return json({ ok: true });
}

// ── Helpers ───────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
