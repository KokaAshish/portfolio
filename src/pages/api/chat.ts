import type { APIRoute } from 'astro';
import { handleChat } from '../../workers/chat';
import type { ChatEnv } from '../../workers/chat';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const runtime = (context.locals as Record<string, unknown>).runtime as
    { env: ChatEnv } | undefined;
  const env = runtime?.env ?? {};
  return handleChat(context.request, env);
};
