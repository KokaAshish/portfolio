import type { APIRoute } from 'astro';
import { handleContact } from '../../workers/contact';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const env = (import.meta as Record<string, unknown>).env as { TO_EMAIL?: string } ?? {};
  return handleContact(request, env);
};
