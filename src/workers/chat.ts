/**
 * Portfolio chatbot Worker handler
 * Route: POST /api/chat
 *
 * Flow:
 * 1. Rate-limit by IP (edge binding, then KV, then in-memory fallback —
 *    same pattern as the contact form, see contact.ts)
 * 2. Validate + trim input, drop anything past the length caps
 * 3. Reject obvious prompt-injection attempts before ever calling the model
 * 4. Call Anthropic with a system prompt grounded in src/data/about-me.ts
 * 5. Scan the model's reply for leaked prompt/secret text before returning it
 *
 * Non-streaming by design: buffering the full reply lets step 5 inspect the
 * complete text before anything reaches the client, which a token-by-token
 * stream would make far harder to do safely.
 */

import { buildSystemPrompt } from '../data/about-me';
import type { RateLimiterBinding } from './contact';

export interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface ChatEnv {
  ANTHROPIC_API_KEY?: string;
  RATE_LIMITER?:      RateLimiterBinding;
  RATE_LIMIT_KV?:     KVNamespace;
}

export interface ChatResult {
  ok:     boolean;
  reply?: string;
  error?: string;
}

const MODEL          = 'claude-haiku-4-5-20251001';
const MAX_TOKENS      = 400;
const MAX_MESSAGE_LEN = 500;
const MAX_HISTORY     = 8; // messages kept, oldest dropped first

// ── Input validation ─────────────────────────────────────────────

export function validateChatInput(
  body: unknown
): { ok: true; message: string; history: ChatMessage[] } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Invalid request body.' };
  }

  const { message, history } = body as Record<string, unknown>;

  if (typeof message !== 'string' || message.trim().length === 0) {
    return { ok: false, error: 'Message is required.' };
  }
  if (message.length > MAX_MESSAGE_LEN) {
    return { ok: false, error: `Message must be under ${MAX_MESSAGE_LEN} characters.` };
  }

  const cleanHistory: ChatMessage[] = Array.isArray(history)
    ? history
        .filter((m): m is ChatMessage =>
          typeof m === 'object' && m !== null &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.length <= MAX_MESSAGE_LEN
        )
        .slice(-MAX_HISTORY)
    : [];

  return { ok: true, message: message.trim(), history: cleanHistory };
}

// ── Prompt-injection defense (input side) ────────────────────────
//
// Deterministic pre-filter — cheaper and more predictable than relying
// on the model alone to resist a jailbreak, and it stops obvious attempts
// before spending an API call on them.

const INJECTION_PATTERNS = [
  /ignore\s+(all|any|the)?\s*(previous|prior|above)\s*(instructions?|prompt)?/i,
  /disregard\s+(all|any|the)?\s*(previous|prior|above)/i,
  /you\s+are\s+now\s+/i,
  /act\s+as\s+(a|an)\s+/i,
  /system\s+prompt/i,
  /reveal\s+(your|the)\s+(instructions?|prompt|rules)/i,
  /repeat\s+(the\s+text|everything)\s+above/i,
  /new\s+instructions\s*:/i,
];

export function looksLikeInjection(message: string): boolean {
  return INJECTION_PATTERNS.some(re => re.test(message));
}

// ── Output filtering — catch leaked system prompt / secrets ──────

const LEAK_PATTERNS = [
  /ANTHROPIC_API_KEY/i,
  /you are the portfolio assistant/i,
  /##\s*Facts about/i,
  /##\s*Rules/i,
];

const SAFE_REFUSAL =
  "I can't share that, but I'm happy to answer questions about Ashish's background, skills, or projects.";

export function filterOutput(text: string): string {
  return LEAK_PATTERNS.some(re => re.test(text)) ? SAFE_REFUSAL : text;
}

// ── Rate limiting — same two-layer pattern as contact.ts, its own
//    key namespace ("chat:<ip>") so quotas don't collide with the
//    contact form's buckets ──────────────────────────────────────

const RATE_LIMIT  = 8;
const RATE_WINDOW = 60 * 1000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimitedInMemory(ip: string): boolean {
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

async function isRateLimitedInKV(ip: string, kv: KVNamespace): Promise<boolean> {
  const key     = `ratelimit:chat:${ip}`;
  const current = await kv.get(key);
  const count   = current ? parseInt(current, 10) : 0;

  if (count >= RATE_LIMIT) return true;

  await kv.put(key, String(count + 1), { expirationTtl: RATE_WINDOW / 1000 });
  return false;
}

export async function isChatRateLimited(ip: string, env: ChatEnv = {}): Promise<boolean> {
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: `chat:${ip}` });
    if (!success) return true;
  }

  if (env.RATE_LIMIT_KV) return isRateLimitedInKV(ip, env.RATE_LIMIT_KV);

  return isRateLimitedInMemory(ip);
}

// ── Main handler ──────────────────────────────────────────────

export async function handleChat(request: Request, env: ChatEnv): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (await isChatRateLimited(ip, env)) {
    return json({ ok: false, error: 'Too many messages. Please wait a moment and try again.' }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Could not parse request body.' }, 400);
  }

  const validation = validateChatInput(body);
  if (!validation.ok) return json(validation, 400);

  const { message, history } = validation;

  if (looksLikeInjection(message)) {
    return json({
      ok: true,
      reply: "I'm just here to answer questions about Ashish's background and projects — I can't follow instructions like that.",
    });
  }

  if (!env.ANTHROPIC_API_KEY) {
    return json({ ok: false, error: 'Chat is not configured.' }, 500);
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        system:     buildSystemPrompt(),
        messages:   [...history, { role: 'user', content: message }],
      }),
    });

    if (!res.ok) {
      console.error('Anthropic API error', res.status, await res.text());
      return json({ ok: false, error: 'The assistant is unavailable right now. Please try again shortly.' }, 502);
    }

    const data = await res.json() as { content?: { type: string; text?: string }[] };
    const text = data.content?.find(b => b.type === 'text')?.text?.trim();

    if (!text) {
      return json({ ok: false, error: 'The assistant is unavailable right now. Please try again shortly.' }, 502);
    }

    return json({ ok: true, reply: filterOutput(text) });
  } catch (err) {
    console.error('Anthropic fetch error', err);
    return json({ ok: false, error: 'The assistant is unavailable right now. Please try again shortly.' }, 502);
  }
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
