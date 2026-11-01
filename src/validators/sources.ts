import { z } from 'zod';

import { allowedSourceTypes, isAllowedSourceType } from '@/lib/constants';
import { Status } from '@/generated/prisma/enums';

const allowedSourceTypeEnum = z.enum(allowedSourceTypes);

/** Status enum matching the database schema for source processing. */
export const sourceStatusEnum = z.nativeEnum(Status);

/**
 * Standard UUID validation schema.
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Schema for route parameters containing a notebookId.
 */
export const notebookIdParamSchema = z.object({
  notebookId: uuidSchema,
});

/**
 * Schema for route parameters containing a sourceId.
 */
export const sourceIdParamSchema = z.object({
  sourceId: uuidSchema,
});

/**
 * Validation schema for the request body when creating a new source.
 */
export const createSourceBodySchema = z.object({
  /** Human-readable name for the source material. */
  sourceTitle: z
    .string()
    .min(1, 'sourceTitle is required and cannot be empty')
    .max(255, 'sourceTitle must be 255 characters or less')
    .trim(),
  /** The specific type of source (YouTube, PDF, Website, etc.). */
  type: allowedSourceTypeEnum.refine(
    (val) => isAllowedSourceType(val),
    'type must be a supported source type'
  ),
  /** The associated file details. */
  file: z.object({
    /** The S3/R2 path or external URL for the file. */
    path: z.string().min(1, 'path is required'),
    /** The MIME type of the content. */
    contentType: z.string().min(1, 'contentType is required'),
  }),
  /** Initial status for processing. Defaults to PROCESSING. */
  status: sourceStatusEnum.default(Status.PROCESSING),
  /** Optional field to store failure reasons. */
  errorMessage: z.string().optional().nullable(),
});

/**
 * Validation schema for renaming a source material.
 */
export const updateSourceTitleBodySchema = z.object({
  sourceTitle: z
    .string()
    .min(1, 'sourceTitle is required and cannot be empty')
    .max(255, 'sourceTitle must be 255 characters or less')
    .trim(),
});

export type NotebookIdParam = z.infer<typeof notebookIdParamSchema>;
export type CreateSourceBody = z.infer<typeof createSourceBodySchema>;
export type SourceIdParam = z.infer<typeof sourceIdParamSchema>;
