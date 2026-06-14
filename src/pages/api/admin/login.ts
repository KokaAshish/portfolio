import type { APIRoute } from 'astro';
import { verifyPassword, makeSessionCookie } from '../../../workers/admin-auth';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const runtime = (context.locals as Record<string, unknown>).runtime as
    { env: { ADMIN_PASSWORD?: string; ADMIN_SECRET?: string } } | undefined;
  const env = runtime?.env ?? {};

  let body: { password?: string };
  try {
    body = await context.request.json();
  } catch {
    return resp({ ok: false, error: 'Invalid request.' }, 400);
  }

  if (!body.password || !verifyPassword(body.password, env)) {
    // Artificial delay — makes brute-forcing 500ms per attempt
    await new Promise(r => setTimeout(r, 500));
    return resp({ ok: false, error: 'Invalid password.' }, 401);
  }

  const cookie = await makeSessionCookie(env);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    },
  });
};

function resp(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
