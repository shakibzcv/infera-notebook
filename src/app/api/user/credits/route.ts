/**
 * User Credits API
 * Retrieves the current message credit balance for the authenticated user.
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { getUserCredits } from '@/lib/credits';

/**
 * GET Handler
 * Returns the numeric balance of available daily credits.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const credits = await getUserCredits(user.id);
    return NextResponse.json({ credits });
  } catch (error) {
    console.error('[GET_CREDITS]', error);
    return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
  }
}
