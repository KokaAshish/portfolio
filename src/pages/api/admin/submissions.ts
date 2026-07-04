import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../workers/admin-auth';
import { listSubmissions, updateStatus } from '../../../workers/admin-submissions';
import type { SubmissionStatus } from '../../../workers/admin-submissions';

export const prerender = false;

type RuntimeEnv = {
  DB?:             D1Database;
  ADMIN_PASSWORD?: string;
};

function getEnv(locals: unknown): RuntimeEnv {
  const runtime = (locals as Record<string, unknown>).runtime as
    { env: RuntimeEnv } | undefined;
  return runtime?.env ?? {};
}

const unauth = () => new Response(JSON.stringify({ ok: false, error: 'Unauthorized.' }), {
  status: 401, headers: { 'Content-Type': 'application/json' },
});

const badReq = (msg: string) => new Response(JSON.stringify({ ok: false, error: msg }), {
  status: 400, headers: { 'Content-Type': 'application/json' },
});

// GET /api/admin/submissions?page=1&status=pending
export const GET: APIRoute = async (context) => {
  const env = getEnv(context.locals);
  if (!await isAuthenticated(context.request, env)) return unauth();
  if (!env.DB) return badReq('Database not configured.');

  const url    = new URL(context.request.url);
  const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const status = url.searchParams.get('status') as SubmissionStatus | null ?? undefined;

  const data = await listSubmissions({ DB: env.DB }, page, 20, status);
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// PATCH /api/admin/submissions  { id, status }
export const PATCH: APIRoute = async (context) => {
  const env = getEnv(context.locals);
  if (!await isAuthenticated(context.request, env)) return unauth();
  if (!env.DB) return badReq('Database not configured.');

  let body: { id?: number; status?: string };
  try { body = await context.request.json(); }
  catch { return badReq('Invalid JSON.'); }

  const validStatuses: SubmissionStatus[] = ['pending', 'reviewed', 'archived'];
  if (!body.id   || typeof body.id !== 'number')              return badReq('id must be a number.');
  if (!body.status || !validStatuses.includes(body.status as SubmissionStatus))
    return badReq('status must be pending | reviewed | archived.');

  const ok = await updateStatus({ DB: env.DB }, body.id, body.status as SubmissionStatus);
  return new Response(JSON.stringify({ ok }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
