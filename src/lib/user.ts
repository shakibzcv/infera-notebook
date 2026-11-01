import { headers } from 'next/headers';
import { User } from '@/generated/prisma/client';

/**
 * Utility to retrieve the current user from the request headers.
 * This relies on middleware to inject the user object into the 'x-user' header
 * after successful session verification.
 *
 * @returns The hydrated User object if present, otherwise null.
 */
export async function getCurrentUser(): Promise<User | null> {
  const headerList = await headers();
  const userHeader = headerList.get('x-user');

  if (!userHeader) {
    return null;
  }

  try {
    const user = JSON.parse(userHeader);
    return user as User;
  } catch (error) {
    console.error('Error parsing user from headers:', error);
    return null;
  }
}

export const getUser = getCurrentUser;
