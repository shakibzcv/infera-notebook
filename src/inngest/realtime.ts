'use server';

import { inngest } from './client';
import { getSubscriptionToken, type Realtime } from '@inngest/realtime';
import { getCurrentUser } from '@/lib/user';

// Token type for notebook-scoped realtime updates
export type NotebookChannelToken = Awaited<
  ReturnType<typeof fetchNotebookRealtimeSubscriptionToken>
>;

/**
 * Generates a secure subscription token for Inngest Realtime.
 * Strictly scopes the listener to a specific notebook's 'note-status' and 'source-status' events.
 *
 * @param notebookId - The ID of the notebook to monitor.
 * @returns A JWT or token string for the frontend Realtime client.
 */
export async function fetchNotebookRealtimeSubscriptionToken(notebookId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Use notebook-scoped channel; authorization already enforced by notebooks APIs
  const token = await getSubscriptionToken(inngest, {
    channel: `notebook:${notebookId}`,
    topics: ['note-status', 'source-status'],
  });

  return token;
}
