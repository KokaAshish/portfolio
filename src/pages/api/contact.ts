import type { APIRoute } from 'astro';
import { handleContact } from '../../workers/contact';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  // Access D1 binding + secrets via Cloudflare runtime env
  const runtime = (context.locals as Record<string, unknown>).runtime as
    { env: { TO_EMAIL?: string; DB?: D1Database } } | undefined;
  const env = runtime?.env ?? {};
  return handleContact(context.request, env);
};
