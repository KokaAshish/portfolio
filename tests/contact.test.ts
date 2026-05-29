import { describe, it, expect, beforeEach } from 'vitest';
import { validatePayload, isRateLimited, handleContact } from '../src/workers/contact';

// ── validatePayload ──────────────────────────────────────────

describe('validatePayload', () => {
  it('accepts a valid payload', () => {
    const result = validatePayload({
      name:    'Ashish Koka',
      email:   'ashishkoka34@gmail.com',
      message: 'Hello, I would like to connect.',
    });
    expect(result.ok).toBe(true);
  });

  it('rejects non-object body', () => {
    expect(validatePayload(null).ok).toBe(false);
    expect(validatePayload('string').ok).toBe(false);
    expect(validatePayload(42).ok).toBe(false);
  });

  it('rejects missing name', () => {
    const r = validatePayload({ email: 'a@b.com', message: 'Hello world here' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/name/i);
  });

  it('rejects name shorter than 2 chars', () => {
    const r = validatePayload({ name: 'A', email: 'a@b.com', message: 'Hello world here' });
    expect(r.ok).toBe(false);
  });

  it('rejects invalid email', () => {
    const r = validatePayload({ name: 'Ashish', email: 'not-an-email', message: 'Hello world here' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/email/i);
  });

  it('rejects missing email', () => {
    const r = validatePayload({ name: 'Ashish', message: 'Hello world here' });
    expect(r.ok).toBe(false);
  });

  it('rejects message shorter than 10 chars', () => {
    const r = validatePayload({ name: 'Ashish', email: 'a@b.com', message: 'Hi' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/message/i);
  });

  it('rejects message over 2000 chars', () => {
    const r = validatePayload({ name: 'Ashish', email: 'a@b.com', message: 'x'.repeat(2001) });
    expect(r.ok).toBe(false);
  });

  it('trims whitespace when checking length', () => {
    const r = validatePayload({ name: 'Ashish', email: 'a@b.com', message: '   short   ' });
    expect(r.ok).toBe(false);
  });
});

// ── isRateLimited ─────────────────────────────────────────────

describe('isRateLimited', () => {
  it('allows first request', () => {
    const ip = `test-ip-${Math.random()}`;
    expect(isRateLimited(ip)).toBe(false);
  });

  it('allows requests up to the limit', () => {
    const ip = `test-ip-${Math.random()}`;
    expect(isRateLimited(ip)).toBe(false); // 1
    expect(isRateLimited(ip)).toBe(false); // 2
    expect(isRateLimited(ip)).toBe(false); // 3
  });

  it('blocks after limit is reached', () => {
    const ip = `test-ip-${Math.random()}`;
    isRateLimited(ip); // 1
    isRateLimited(ip); // 2
    isRateLimited(ip); // 3
    expect(isRateLimited(ip)).toBe(true); // 4 — over limit
  });

  it('treats different IPs independently', () => {
    const ip1 = `test-ip-a-${Math.random()}`;
    const ip2 = `test-ip-b-${Math.random()}`;
    isRateLimited(ip1);
    isRateLimited(ip1);
    isRateLimited(ip1);
    isRateLimited(ip1); // blocked
    expect(isRateLimited(ip2)).toBe(false); // ip2 is unaffected
  });
});

// ── handleContact (integration-style) ────────────────────────

describe('handleContact', () => {
  function makeRequest(body: unknown, method = 'POST'): Request {
    return new Request('https://example.com/api/contact', {
      method,
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': `1.2.3.${Math.floor(Math.random() * 254) + 1}` },
      body: JSON.stringify(body),
    });
  }

  it('returns 405 for GET requests', async () => {
    const req = new Request('https://example.com/api/contact', { method: 'GET' });
    const res = await handleContact(req, {});
    expect(res.status).toBe(405);
  });

  it('returns 400 for invalid payload', async () => {
    const req = makeRequest({ name: 'A', email: 'bad', message: 'hi' });
    const res = await handleContact(req, {});
    expect(res.status).toBe(400);
    const json = await res.json() as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(typeof json.error).toBe('string');
  });

  it('returns 400 for malformed JSON', async () => {
    const req = new Request('https://example.com/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '9.9.9.9' },
      body: 'not json',
    });
    const res = await handleContact(req, {});
    expect(res.status).toBe(400);
  });

  it('returns JSON with Content-Type header', async () => {
    const req = makeRequest({ name: 'X', email: 'bad', message: 'short' });
    const res = await handleContact(req, {});
    expect(res.headers.get('Content-Type')).toContain('application/json');
  });
});
