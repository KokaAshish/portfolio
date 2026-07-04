import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSession,
  validateSession,
  deleteSession,
  isAuthenticated,
  verifyCredentials,
} from '../src/workers/admin-auth';

// ── Minimal in-memory fake of the D1Database surface we actually use ──

interface Row { id: string; ip: string | null; user_agent: string | null; expires_at: string }

function makeFakeDB() {
  const rows = new Map<string, Row>();

  function statement(sql: string, args: unknown[]) {
    return {
      bind(...boundArgs: unknown[]) {
        return statement(sql, boundArgs);
      },
      async run() {
        if (sql.startsWith('DELETE FROM admin_sessions WHERE expires_at')) {
          const now = new Date().toISOString();
          for (const [id, row] of rows) if (row.expires_at < now) rows.delete(id);
        } else if (sql.startsWith('INSERT INTO admin_sessions')) {
          const [id, ip, userAgent, expiresAt] = args as [string, string | null, string | null, string];
          rows.set(id, { id, ip, user_agent: userAgent, expires_at: expiresAt });
        } else if (sql.startsWith('DELETE FROM admin_sessions WHERE id')) {
          rows.delete(args[0] as string);
        }
        return { success: true };
      },
      async first() {
        const [id] = args as [string];
        const row = rows.get(id);
        if (!row) return null;
        return row.expires_at > new Date().toISOString() ? { id: row.id } : null;
      },
    };
  }

  const db = {
    prepare(sql: string) {
      return statement(sql, []);
    },
  };

  return db as unknown as D1Database;
}

describe('admin sessions (D1-backed)', () => {
  let DB: D1Database;

  beforeEach(() => {
    DB = makeFakeDB();
  });

  it('creates a session and validates it', async () => {
    const id = await createSession({ DB }, { ip: '1.2.3.4' });
    expect(typeof id).toBe('string');
    expect(await validateSession({ DB }, id)).toBe(true);
  });

  it('rejects an unknown session id', async () => {
    expect(await validateSession({ DB }, 'not-a-real-session')).toBe(false);
  });

  it('rejects an empty session id', async () => {
    expect(await validateSession({ DB }, '')).toBe(false);
  });

  it('logout actually revokes the session — not just clears the cookie', async () => {
    const id = await createSession({ DB });
    expect(await validateSession({ DB }, id)).toBe(true);

    await deleteSession({ DB }, id);

    // The same session id must now be rejected server-side, even if an
    // attacker replays the old cookie value directly.
    expect(await validateSession({ DB }, id)).toBe(false);
  });

  it('isAuthenticated reads the session cookie and checks the store', async () => {
    const id = await createSession({ DB });
    const req = new Request('https://example.com/admin', {
      headers: { Cookie: `admin_session=${id}` },
    });
    expect(await isAuthenticated(req, { DB })).toBe(true);
  });

  it('isAuthenticated fails without a cookie', async () => {
    const req = new Request('https://example.com/admin');
    expect(await isAuthenticated(req, { DB })).toBe(false);
  });

  it('isAuthenticated fails after logout revokes the session', async () => {
    const id = await createSession({ DB });
    await deleteSession({ DB }, id);

    const req = new Request('https://example.com/admin', {
      headers: { Cookie: `admin_session=${id}` },
    });
    expect(await isAuthenticated(req, { DB })).toBe(false);
  });
});

describe('verifyCredentials', () => {
  const env = { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'hunter2' };

  it('accepts matching username and password', () => {
    expect(verifyCredentials('admin', 'hunter2', env)).toBe(true);
  });

  it('rejects wrong password', () => {
    expect(verifyCredentials('admin', 'wrong', env)).toBe(false);
  });

  it('rejects wrong username', () => {
    expect(verifyCredentials('someone-else', 'hunter2', env)).toBe(false);
  });
});
