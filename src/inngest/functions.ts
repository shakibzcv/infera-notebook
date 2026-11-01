import { NonRetriableError } from 'inngest';
import { inngest } from './client';
import {
  convertVectorsToChunks,
  getDocumentFromSources,
  initializeVectorStore,
  processSourceToVectors,
  saveToVectorStore,
  updateSourceTable,
} from './helpers';
import { Status, AllowedNoteType } from '@/generated/prisma/enums';
import { noteRegistry } from '@/lib/notes/registry';
import { saveNote } from './helpers';
import { INNGEST_DEFAULT_RETRIES } from '@/lib/constants';
import { getYouTubeTitle } from '@/lib/youtube';
import { uploadBuffer, deleteFile, deleteSourceStorage } from '@/lib/s3';
import { deleteNoteAssets } from '@/lib/note-utils';
import prisma from '@/lib/prisma';

/**
 * Inngest function to process a source material.
 *
 * Workflow:
 * 1. Extract raw text/documents from the source (PDF, URL, YouTube, etc).
 * 2. Split text into manageable chunks using RecursiveCharacterTextSplitter.
 * 3. Generate embeddings and save chunks to the Pinecone vector store.
 * 4. Update the database record status to SUCCESS or FAILED.
 * 5. Publish status updates to the realtime channel.
 */
export const processSource = inngest.createFunction(
  {
    id: 'process-source',
    name: 'Process Source',
    description: 'Processes a source after it has been created',
    cancelOn: [
      {
        event: 'source/deleted',
        match: 'data.sourceId',
      },
    ],
    retries: INNGEST_DEFAULT_RETRIES,
  },
  { event: 'notebook/source-process' },
  async ({ event, step, publish }) => {
    const { sourceId, notebookId, type, url, userId, sourceTitle } = event.data;

    if (!sourceId || !notebookId || !type || !url || !userId) {
      throw new NonRetriableError('Missing required fields');
    }

    try {
      // Step 1: Extraction
      const { processingVectors, inferredTitle } = await step.run(
        'process-source-to-vectors',
        async () => {
          const result = await processSourceToVectors({ url, type });

          // Extract title for websites and YouTube videos from metadata
          let title = null;
          if ((type === 'WEBSITE' || type === 'YOUTUBE') && result.length > 0) {
            title = result[0].metadata?.title || null;
          }

          return {
            processingVectors: result
              .map((doc) => doc.pageContent)
              .filter((content) => content.trim().length > 0),
            inferredTitle: title,
          };
        }
      );

      // Update the title in the DB immediately after extraction if a better one was found
      if (inferredTitle) {
        await step.run('update-db-title', async () => {
          await updateSourceTable(sourceId, Status.PROCESSING, inferredTitle);
        });
      }

      if (!processingVectors || processingVectors.length === 0) {
        throw new NonRetriableError(
          'Failed to process source: No content could be extracted or the document is empty. Firecrawl might have failed to scrape this URL.'
        );
      }

      // Cache extracted text to S3 for ultra-fast, zero-penalty note generation
      await step.run('cache-extracted-text', async () => {
        try {
          const fullExtractedText = processingVectors.join('\n\n');
          await uploadBuffer(
            Buffer.from(fullExtractedText, 'utf-8'),
            `extracted-text/${sourceId}.txt`,
            'text/plain'
          );
        } catch (err) {
          console.warn('[Inngest] Failed to cache extracted text to S3:', err);
        }
      });

      // Step 2: Splitting
      const convertedVectorChunks = await step.run('converts-vector-chunks', async () => {
        const result = await convertVectorsToChunks(processingVectors);
        return result;
      });

      if (!convertedVectorChunks || convertedVectorChunks.length === 0) {
        throw new NonRetriableError(
          'Failed to convert vectors to chunks: The resulting chunk list is empty.'
        );
      }

      // Step 3: Vector Store Population
      const finalTitle = await step.run('save-the-chunks-to-the-vector-store', async () => {
        // Use inferred title if available (e.g. from website metadata)
        let currentTitle = inferredTitle || sourceTitle;

        // Fetch actual YouTube title if it's a YouTube source
        if (type === 'YOUTUBE') {
          try {
            currentTitle = await getYouTubeTitle(url);
          } catch (err) {
            console.error('[Inngest] Failed to fetch YouTube title:', err);
          }
        }

        await saveToVectorStore(convertedVectorChunks, {
          sourceId,
          notebookId,
          userId,
          sourceType: type,
          sourceTitle: currentTitle,
        });

        return currentTitle;
      });

      // Step 4: Finalize DB record
      await step.run('update-db-success', async () => {
        const updated = await updateSourceTable(sourceId, Status.SUCCESS, finalTitle);
        if (!updated) {
          // Source was deleted while processing was underway
          await deleteFile(`extracted-text/${sourceId}.txt`);
        }
      });

      // Step 5: Notify UI via SSE
      await publish({
        channel: `notebook:${notebookId}`,
        topic: 'source-status',
        data: {
          sourceId,
          status: Status.SUCCESS,
          sourceTitle: finalTitle,
        },
      });

      return {
        success: true,
        title: finalTitle,
      };
    } catch (error) {
      // Cleanup/Failure path
      await step.run('update-db-failed', async () => {
        await updateSourceTable(sourceId, Status.FAILED, sourceTitle);
      });

      await publish({
        channel: `notebook:${notebookId}`,
        topic: 'source-status',
        data: {
          sourceId,
          status: Status.FAILED,
        },
      });

      throw error;
    }
  }
);

/**
 * Inngest function to generate a specific note based on source materials.
 *
 * Workflow:
 * 1. Gather all selected source texts and combine them (with optional summarization).
 * 2. Look up the appropriate creation handler in the noteRegistry.
 * 3. Execute the handler to generate structured content (Mindmaps, Quizzes, etc).
 * 4. Persist the generated content to the database and notify the UI.
 */
export const createNote = inngest.createFunction(
  {
    id: 'create-note',
    name: 'Create Note',
    description: 'Creates a note (placeholder – currently just logs data)',
    cancelOn: [
      {
        event: 'note/deleted',
        match: 'data.noteId',
      },
    ],
  },
  { event: 'note/created' },
  async ({ event, step, publish }) => {
    const { noteId, notebookId, userId, type, title, sourceIds } = event.data as {
      noteId: string;
      notebookId: string;
      userId: string;
      type: AllowedNoteType;
      title: string;
      sourceIds?: string[];
    };

    // Aggregate sources into a single context document
    const document = await getDocumentFromSources(step, sourceIds || []);

    const handler = noteRegistry[type];

    if (!handler) {
      await step.run('log-unsupported-note-type', async () => {
        console.log('[Inngest note/created] no handler for type:', type, {
          noteId,
          notebookId,
          userId,
          sourceIds,
        });
      });

      await publish({
        channel: `notebook:${notebookId}`,
        topic: 'note-status',
        data: {
          noteId,
          status: Status.FAILED,
        },
      });

      return {
        status: `Note ${noteId} created with no handler for type ${type}.`,
      };
    }

    let content: any;

    try {
      content = await handler(step, document, notebookId);

      if (!content) {
        throw new NonRetriableError('Note handler did not return any content');
      }

      await step.run('update-db-success', async () => {
        const saved = await saveNote(
          noteId,
          content.title,
          JSON.stringify(content.content),
          Status.SUCCESS
        );
        if (!saved && content?.content) {
          // Note was deleted while generation was in progress.
          // Clean up any generated assets immediately to prevent orphaned S3 files.
          await deleteNoteAssets(type, content.content);
        }
      });

      // Realtime: notify client that the note is ready
      await publish({
        channel: `notebook:${notebookId}`,
        topic: 'note-status',
        data: {
          noteId,
          noteTitle: content.title,
          status: Status.SUCCESS,
        },
      });

      return {
        status: `Note ${noteId} created and processed by handler for type ${type}.`,
      };
    } catch (error) {
      await step.run('update-db-failed', async () => {
        await saveNote(noteId, title, '', Status.FAILED);
      });

      await publish({
        channel: `notebook:${notebookId}`,
        topic: 'note-status',
        data: {
          noteId,
          noteTitle: title,
          status: Status.FAILED,
        },
      });

      throw error;
    }
  }
);

/**
 * Inngest function to handle background deletion and cleanup of a source.
 * Purges Pinecone vector chunks, S3 storage (raw file + extracted-text cache),
 * and any orphaned File record in PostgreSQL.
 */
export const deleteSource = inngest.createFunction(
  {
    id: 'delete-source',
    name: 'Delete Source Cleanup',
    description:
      'Cleans up Pinecone vectors, S3 files, and database records when a source is deleted',
    retries: 2,
  },
  { event: 'source/deleted' },
  async ({ event, step }) => {
    const { sourceId, filePath, fileId } = event.data as {
      sourceId: string;
      filePath?: string | null;
      fileId?: string | null;
    };

    if (!sourceId) {
      return { skipped: true, reason: 'No sourceId provided' };
    }

    // 1. Delete Pinecone vectors
    await step.run('delete-pinecone-vectors', async () => {
      try {
        const vectorStore = await initializeVectorStore();
        await vectorStore.delete({
          filter: { sourceId: { $eq: sourceId } },
        });
      } catch (e) {
        console.error(`[Inngest deleteSource] Pinecone cleanup failed for ${sourceId}:`, e);
      }
    });

    // 2. Delete S3 storage (both raw file and extracted-text cache)
    await step.run('delete-s3-storage', async () => {
      try {
        await deleteSourceStorage(sourceId, filePath);
      } catch (e) {
        console.error(`[Inngest deleteSource] S3 cleanup failed for ${sourceId}:`, e);
      }
    });

    // 3. Clean up orphaned database File record if specified
    if (fileId) {
      await step.run('delete-db-file-record', async () => {
        try {
          await prisma.file.delete({
            where: { id: fileId },
          });
        } catch {
          // Record may already be deleted or not found
        }
      });
    }

    return { success: true, sourceId };
  }
);

/**
 * Inngest function to handle background deletion and cleanup of a notebook.
 * Purges all Pinecone vector chunks, all source files in S3, all note media assets in S3,
 * and cancels in-flight jobs.
 */
export const deleteNotebook = inngest.createFunction(
  {
    id: 'delete-notebook',
    name: 'Delete Notebook Cleanup',
    description:
      'Cleans up all vectors, storage assets, and in-flight jobs when a notebook is deleted',
    retries: 2,
  },
  { event: 'notebook/deleted' },
  async ({ event, step }) => {
    const {
      notebookId,
      sources = [],
      notes = [],
      fileIds = [],
    } = event.data as {
      notebookId: string;
      sources?: Array<{ id: string; filePath?: string | null }>;
      notes?: Array<{ id: string; type: AllowedNoteType; content: string | null }>;
      fileIds?: string[];
    };

    if (!notebookId) {
      return { skipped: true, reason: 'No notebookId provided' };
    }

    // 1. Cancel in-flight Inngest jobs for sources and notes
    await step.run('cancel-in-flight-jobs', async () => {
      await Promise.allSettled([
        ...sources.map((s) =>
          inngest.send({
            name: 'source/deleted',
            data: { sourceId: s.id },
          })
        ),
        ...notes.map((n) =>
          inngest.send({
            name: 'note/deleted',
            data: { noteId: n.id },
          })
        ),
      ]).catch(() => {});
    });

    // 2. Delete Pinecone vectors for the whole notebook
    await step.run('delete-pinecone-vectors', async () => {
      try {
        const vectorStore = await initializeVectorStore();
        await vectorStore.delete({
          filter: { notebookId: { $eq: notebookId } },
        });
      } catch (e) {
        console.error(`[Inngest deleteNotebook] Pinecone cleanup failed for ${notebookId}:`, e);
      }
    });

    // 3. Delete S3 storage for all sources (raw files + extracted-text cache)
    if (sources.length > 0) {
      await step.run('delete-sources-storage', async () => {
        await Promise.allSettled(sources.map((s) => deleteSourceStorage(s.id, s.filePath)));
      });
    }

    // 4. Delete S3 storage for all notes (audio overview, video overview, infographics, slides)
    if (notes.length > 0) {
      await step.run('delete-notes-storage', async () => {
        await Promise.allSettled(notes.map((n) => deleteNoteAssets(n.type, n.content)));
      });
    }

    // 5. Clean up any remaining orphaned File records in database
    if (fileIds.length > 0) {
      await step.run('delete-db-file-records', async () => {
        try {
          await prisma.file.deleteMany({
            where: { id: { in: fileIds } },
          });
        } catch {
          // Ignore if already deleted
        }
      });
    }

    return { success: true, notebookId };
  }
);
