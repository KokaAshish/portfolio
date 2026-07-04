import type { APIRoute } from 'astro';
import { clearSessionCookie, deleteSession, readSessionCookie } from '../../../workers/admin-auth';

export const prerender = false;

type RuntimeEnv = { DB?: D1Database };

export const POST: APIRoute = async (context) => {
  const runtime = (context.locals as Record<string, unknown>).runtime as
    { env: RuntimeEnv } | undefined;
  const env = runtime?.env ?? {};

  // Revoke server-side — a cleared cookie alone would leave the session
  // in `admin_sessions` valid and replayable until its 24h expiry.
  const sessionId = readSessionCookie(context.request);
  if (sessionId) await deleteSession(env, sessionId);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookie(),
    },
  });
};
