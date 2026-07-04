import type { APIRoute } from 'astro';
import { handleContact } from '../../workers/contact';
import type { ContactEnv } from '../../workers/contact';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  // Access D1/KV/rate-limiter bindings + secrets via Cloudflare runtime env
  const runtime = (context.locals as Record<string, unknown>).runtime as
    { env: ContactEnv } | undefined;
  const env = runtime?.env ?? {};
  return handleContact(context.request, env);
};
