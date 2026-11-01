/**
 * Inngest Background Function API
 * This endpoint serves as the communication bridge between Inngest and our application.
 * It exposes our background functions so they can be triggered by events and managed
 * with durable execution, retries, and state management.
 */
import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { processSource, createNote, deleteSource, deleteNotebook } from '@/inngest/functions';

/**
 * Configure the Inngest serve handler.
 * - processSource: Handles document ingestion and vectorization.
 * - createNote: Generates AI-based notes (Mindmaps, Podcasts, etc.).
 * - deleteSource: Cleans up Pinecone vectors, S3 storage, and orphaned files for a deleted source.
 * - deleteNotebook: Cleans up all vectors, storage assets, and in-flight jobs for a deleted notebook.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processSource, createNote, deleteSource, deleteNotebook],
});
