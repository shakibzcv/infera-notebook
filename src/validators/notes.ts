import { z } from 'zod';
import { AllowedNoteType, Status } from '@/generated/prisma/enums';
import { uuidSchema } from './sources';

/** Valid note types as defined in the Prisma schema. */
export const noteTypeEnum = z.nativeEnum(AllowedNoteType);

/** Valid processing statuses for a note. */
export const noteStatusEnum = z.nativeEnum(Status);

/**
 * Common schema for note title validation.
 * Ensures the title is non-empty and fits within database constraints.
 */
export const noteTitleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(255, 'Title must be 255 characters or less')
  .trim();

/**
 * Request body schema for creating a new note.
 */
export const createNoteBodySchema = z.object({
  /** A pre-generated UUID for the note to ensure immediate client-side tracking. */
  noteId: uuidSchema,
  /** The type of note to generate (e.g., MIND_MAP, AUDIO_OVERVIEW). */
  type: noteTypeEnum,
  /** Optional initial title. */
  title: z.string().optional().nullable(),
  /** IDs of source materials the note should be based on. */
  sourceIds: z.array(uuidSchema).optional(),
  /** Optional initial markdown or JSON content. */
  content: z.string().optional(),
});

/**
 * Request body schema for updating an existing note.
 */
export const updateNoteBodySchema = z.object({
  noteTitle: noteTitleSchema.optional(),
  content: z.string().optional(),
  status: noteStatusEnum.optional(),
});

/**
 * Parameter schema for routes identifying a single note.
 */
export const noteIdParamSchema = z.object({
  noteId: uuidSchema,
});

/**
 * Request body schema for note deletion.
 * Supports deleting a specific note or all notes in a notebook.
 */
export const deleteNoteBodySchema = z.object({
  noteId: uuidSchema.optional(),
  /** flag to indicate bulk deletion. */
  all: z.boolean().optional(),
});

/**
 * Parameter schema for routes identifying both a notebook and a specific note.
 */
export const notebookNoteParamsSchema = z.object({
  notebookId: uuidSchema,
  noteId: uuidSchema,
});

export type CreateNoteBody = z.infer<typeof createNoteBodySchema>;
export type UpdateNoteBody = z.infer<typeof updateNoteBodySchema>;
export type NoteIdParam = z.infer<typeof noteIdParamSchema>;
export type NotebookNoteParams = z.infer<typeof notebookNoteParamsSchema>;
