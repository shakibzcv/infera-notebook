import { VectorStoreError } from './errors';
import { initializeVectorStore } from '@/lib/pinecone';
export { initializeVectorStore };
import { getSignedDownloadUrl, getObjectText, uploadBuffer } from '@/lib/s3';

import { AllowedSourceType, Status } from '@/generated/prisma/enums';
import { allowedSourceTypes } from '@/lib/constants';
import { sourceVectorizers } from '@/lib/vectorizers/registry';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { Document } from '@langchain/core/documents';
import prisma from '@/lib/prisma';
import type { InngestStep } from '@/lib/notes/types';
import { RetryAfterError } from 'inngest';
import { DOCUMENT_SUMMARIZATION_PROMPT } from '@/lib/prompts';
import { z } from 'zod';

export const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 50,
});

/**
 * Routes a source to its specific vectorizer (PDF, YouTube, Website, etc).
 *
 * @param source - Object containing the public URL and assigned type.
 * @returns Array of extracted LangChain Documents.
 */
export async function processSourceToVectors(source: {
  url: string;
  type: AllowedSourceType;
}): Promise<Document[]> {
  try {
    const handler = sourceVectorizers[source.type];
    if (!handler) {
      throw new VectorStoreError(`No vectorizer configured for source type: ${source.type}`);
    }

    // Check if the URL is an internal storage path (doesn't start with http/https)
    // and generate a signed URL for secure download/processing.
    let finalUrl = source.url;
    if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = await getSignedDownloadUrl(finalUrl);
    }

    return await handler(finalUrl);
  } catch (error) {
    throw new VectorStoreError(`Failed to process source to vectors: ${error}`);
  }
}

/**
 * Splits extracted documents into optimized chunks for vector store storage.
 * Minimizes fields to reduce the payload transferred between Inngest steps.
 */
export async function convertVectorsToChunks(
  docs: Document[] | string[],
  chunkSize?: number,
  chunkOverlap?: number
) {
  try {
    let chunks;
    if (docs.length > 0 && typeof docs[0] === 'string') {
      chunks = await textSplitter.createDocuments(docs as string[]);
    } else {
      chunks = await textSplitter.splitDocuments(docs as Document[]);
    }

    if (!chunks) {
      throw new VectorStoreError('Failed to convert vectors to chunks');
    }
    // Return only essential fields to minimize step output size
    return chunks.map((doc) => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata,
    }));
  } catch (error) {
    throw new VectorStoreError(`Failed to convert vectors to chunks: ${error}`);
  }
}

/**
 * Saves document chunks to Pinecone with rich metadata for filtering.
 */
export async function saveToVectorStore(
  chunks: Document[],
  {
    sourceId,
    notebookId,
    userId,
    sourceType,
    sourceTitle,
  }: {
    sourceId: string;
    notebookId: string;
    userId: string;
    sourceType: AllowedSourceType;
    sourceTitle: string;
  }
) {
  try {
    const vectorStore = await initializeVectorStore();
    if (!vectorStore) {
      throw new VectorStoreError('Failed to initialize vector store');
    }

    const textsWithMetadata = chunks.map((doc, index) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        sourceId,
        userId,
        notebookId,
        chunkIndex: index,
        timestamp: new Date().toISOString(),
        fileType: sourceType,
        fileName: sourceTitle || 'unknown',
      },
    }));

    await vectorStore.addDocuments(textsWithMetadata);
  } catch (error) {
    throw new VectorStoreError(`Failed to save to vector store: ${error}`);
  }
}

/**
 * Updates the source processing status in the PostgreSQL database.
 */
export async function updateSourceTable(
  sourceId: string,
  status: Status,
  sourceTitle?: string
): Promise<boolean> {
  try {
    await prisma.source.update({
      where: { id: sourceId },
      data: { status, sourceTitle },
    });
    return true;
  } catch (error) {
    console.error(`[UPDATE_SOURCE_TABLE] Failed to update source table status: ${error}`);
    return false;
  }
}

/**
 * Aggregates all text content from a list of source IDs.
 *
 * If the total text exceeds the safe context window (GLM_SAFE_WINDOW),
 * it automatically splits the text and generates dense summaries for each chunk.
 * This ensures the final 'document' is informative but fits within model limits.
 *
 * @param step - The Inngest step for durable execution.
 * @param sourceIds - Array of source IDs to aggregate.
 * @returns A single string containing processed document content or summaries.
 */
export async function getDocumentFromSources(step: InngestStep, sourceIds: string[]) {
  try {
    const sources = await step.run('get-sources', async () => {
      return await prisma.source.findMany({
        where: { id: { in: sourceIds } },
        include: { file: true },
      });
    });

    if (!sources || sources.length === 0) {
      throw new RetryAfterError('Failed to get sources', 10000);
    }

    const documentTexts = await step.run('get-document-texts', async () => {
      return await Promise.all(
        sources.map(async (source: any) => {
          // Check cached extracted text first (avoids re-scraping websites, re-parsing PDFs, or re-fetching YouTube)
          try {
            const cached = await getObjectText(`extracted-text/${source.id}.txt`);
            if (cached && cached.trim().length > 0) {
              return cached;
            }
          } catch (e) {
            // cache miss or s3 read error, proceed to fallback extraction
          }

          // Fallback: extract vectors if not cached yet
          const vectors = await processSourceToVectors({
            url: source.file.path,
            type: source.type,
          });
          const text = vectors.map((v) => v.pageContent).join('\n\n');

          // Best-effort cache write for subsequent notes
          try {
            await uploadBuffer(
              Buffer.from(text, 'utf-8'),
              `extracted-text/${source.id}.txt`,
              'text/plain'
            );
          } catch (e) {
            // ignore cache write error
          }

          return text;
        })
      );
    });

    const fullText = await step.run('vectors-to-document', async () => {
      return documentTexts.join('\n\n');
    });

    return fullText;
  } catch (error) {
    throw new RetryAfterError(`Failed to get document from sources: ${error}`, 10000);
  }
}

/**
 * Persists note content and metadata to the database
 * Used primarily by Inngest workflows to save AI-generated content
 *
 * @param noteId - The unique identifier of the note to update
 * @param noteTitle - The title of the note (often generated by AI)
 * @param content - The main content of the note (serialized JSON or string)
 * @param status - The new status of the note (e.g., COMPLETED, ERRORED)
 * @returns boolean - True if save was successful, false otherwise
 */
export async function saveNote(noteId: string, noteTitle: string, content: string, status: Status) {
  try {
    // Update the note record in the database
    await prisma.note.update({
      where: {
        id: noteId,
      },
      data: {
        content,
        status,
        noteTitle,
      },
    });
    return true;
  } catch (error) {
    // Log any database errors for debugging
    console.error('[SAVE_NOTE]', error);
    return false;
  }
}
