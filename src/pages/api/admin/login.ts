import type { APIRoute } from 'astro';
import { verifyCredentials, makeSessionCookie } from '../../../workers/admin-auth';

export const prerender = false;

type RuntimeEnv = {
  DB?:             D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_USERNAME?: string;
};

export const POST: APIRoute = async (context) => {
  const runtime = (context.locals as Record<string, unknown>).runtime as
    { env: RuntimeEnv } | undefined;
  const env = runtime?.env ?? {};

  let body: { username?: string; password?: string };
  try {
    body = await context.request.json();
  } catch {
    return resp({ ok: false, error: 'Invalid request.' }, 400);
  }

  if (!body.username || !body.password || !verifyCredentials(body.username, body.password, env)) {
    await new Promise(r => setTimeout(r, 500)); // brute-force delay
    return resp({ ok: false, error: 'Invalid username or password.' }, 401);
  }

  if (!env.DB) return resp({ ok: false, error: 'Database not configured.' }, 500);

  const cookie = await makeSessionCookie(env, {
    ip:        context.request.headers.get('CF-Connecting-IP') ?? undefined,
    userAgent: context.request.headers.get('User-Agent') ?? undefined,
  });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
  });
};

function resp(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
