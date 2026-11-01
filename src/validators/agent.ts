import { z } from 'zod';
import { uuidSchema } from './sources';

// Voice Agent Chat Body Schema
/**
 * Zod schema for the voice agent chat request body.
 * Validates the interactive audio session parameters.
 */
export const voiceAgentChatBodySchema = z.object({
  /** User's text query or transcription */
  query: z.string().optional().nullable(),
  /** The unique ID of the note being discussed */
  noteId: uuidSchema,
  /** The primary content or context for the agent to consider */
  context: z.string().min(1, 'Context is required'),
  /** Optional metadata about participants in the conversation */
  participants: z.array(z.any()).optional(),
  /** The unique ID of the notebook for session/context affinity */
  notebookId: uuidSchema.optional(),
});

/** Type representing the validated voice agent chat request body. */
export type VoiceAgentChatBody = z.infer<typeof voiceAgentChatBodySchema>;
