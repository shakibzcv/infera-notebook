import { createAuthClient } from 'better-auth/react';

/**
 * Client-side authentication client for Better Auth.
 * Used in React components to interact with the authentication system.
 * It automatically handles session management and basic auth requests.
 */
export const authClient = createAuthClient({
  /**
   * The base URL of the authentication server.
   * Defaults to localhost for development if not provided in environment variables.
   */
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
});
