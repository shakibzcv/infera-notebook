/**
 * Better Auth API Route Handler
 * This catch-all route handles all authentication-related requests (login, signup, session, etc.)
 * by delegating them to the Better Auth Next.js handler.
 *
 * @see {@link '@/lib/auth'} for the core authentication configuration.
 */
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const dynamic = 'force-dynamic';

export const GET = async (req: Request) => {
  const { GET } = toNextJsHandler(auth);
  return GET(req);
};

export const POST = async (req: Request) => {
  const { POST } = toNextJsHandler(auth);
  return POST(req);
};
