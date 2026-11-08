import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from './prisma';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BETTER_AUTH_SECRET } from './env';

/**
 * Server-side Better Auth configuration.
 * Configures database adapters and Google OAuth authentication.
 */
export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  /**
   * Database adapter for Prisma.
   * Connects Better Auth to the PostgreSQL database for storing users, sessions, and accounts.
   */
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  /**
   * Social Authentication Providers.
   * Configures OAuth2 flows for platforms like Google.
   */
  socialProviders: {
    google: {
      enabled: true,
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    },
  },

  /**
   * Account behavior settings.
   */
  account: {
    /**
     * Automatically links accounts that share the same verified email address.
     */
    accountLinking: {
      enabled: true,
    },
  },
});
