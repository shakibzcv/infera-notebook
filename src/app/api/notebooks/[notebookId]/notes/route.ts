/**
 * Notebook Notes Controller
 * Manages the lifecycle of AI-generated and manual notes within a notebook.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user';
import { notebookIdParamSchema } from '@/validators/sources';
import { AllowedNoteType, Status } from '@/generated/prisma/enums';
import { inngest } from '@/inngest/client';
import { deductCredit } from '@/lib/credits';
import { generateNoteTitleFromMessage } from '@/lib/llm';
import { createNoteBodySchema, deleteNoteBodySchema } from '@/validators/notes';
import { deleteFile, uploadAsset, getSignedDownloadUrl, getPresignedUploadUrl } from '@/lib/s3';
import { deleteNoteAssets } from '@/lib/note-utils';

/**
 * GET Handler
 * Retrieves all notes associated with a notebook.
 * Content is omitted for performance reasons; it should be fetched individually.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ notebookId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId: rawNotebookId } = await params;

    // Validate notebookId parameter
    const paramValidation = notebookIdParamSchema.safeParse({
      notebookId: rawNotebookId,
    });

    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid notebook ID',
          details: paramValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const { notebookId } = paramValidation.data;

    const notebook = await prisma.notebook.findFirst({
      where: {
        id: notebookId,
        userId: user.id,
      },
    });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const notes = await prisma.note.findMany({
      where: { notebookId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        noteTitle: true,
        type: true,
        status: true,
        updatedAt: true,
        createdAt: true,
        sources: {
          select: {
            id: true,
          },
        },
        // Deliberately omit content for list view
      },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('[GET_NOTES_BY_NOTEBOOK]', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ notebookId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId: rawNotebookId } = await params;

    const paramValidation = notebookIdParamSchema.safeParse({
      notebookId: rawNotebookId,
    });

    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid notebook ID',
          details: paramValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const { notebookId } = paramValidation.data;

    const notebook = await prisma.notebook.findFirst({
      where: {
        id: notebookId,
        userId: user.id,
      },
    });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const jsonBody = await request.json();
    const bodyValidation = createNoteBodySchema.safeParse(jsonBody);

    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: bodyValidation.error.format() },
        { status: 400 }
      );
    }

    const { noteId, type, title, sourceIds, content } = bodyValidation.data;
    const bodyContent = content || '';

    // Generate title server-side for CHAT_NOTE if needed
    let finalTitle = title;
    if (
      type === AllowedNoteType.CHAT_NOTE &&
      (!finalTitle || finalTitle === 'Saving note...' || finalTitle === 'Chat Note')
    ) {
      finalTitle = await generateNoteTitleFromMessage(bodyContent);
    }

    if (!finalTitle) {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 });
    }

    // For EDITABLE_NOTE and CHAT_NOTE, mark as SUCCESS immediately (no processing needed)
    const isEditableNote = type === AllowedNoteType.EDITABLE_NOTE;
    const isChatNote = type === AllowedNoteType.CHAT_NOTE;
    const needsProcessing = !isEditableNote && !isChatNote;

    // Deduct credit for AI-generated notes (including chat notes)
    if (needsProcessing || isChatNote) {
      const success = await deductCredit(user.id);
      if (!success) {
        return NextResponse.json(
          { error: 'Credits exhausted. Please wait for the daily reset.' },
          { status: 403 }
        );
      }
    }

    const note = await prisma.note.create({
      data: {
        id: noteId,
        notebookId,
        type,
        noteTitle: finalTitle,
        content: isChatNote ? bodyContent : '',
        status: needsProcessing ? Status.PROCESSING : Status.SUCCESS,
        sources: {
          connect: Array.isArray(sourceIds) ? sourceIds.map((id) => ({ id })) : [],
        },
      },
      include: {
        sources: true,
      },
    });

    // Only fire Inngest event for notes that need processing
    if (needsProcessing) {
      await inngest.send({
        name: 'note/created',
        data: {
          noteId,
          notebookId,
          userId: user.id,
          type,
          title: finalTitle,
          sourceIds: Array.isArray(sourceIds) ? sourceIds : [],
        },
      });
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error('[CREATE_NOTE]', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ notebookId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId: rawNotebookId } = await params;

    const paramValidation = notebookIdParamSchema.safeParse({
      notebookId: rawNotebookId,
    });

    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid notebook ID',
          details: paramValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const { notebookId } = paramValidation.data;

    const jsonBody = await request.json();
    const bodyValidation = deleteNoteBodySchema.safeParse(jsonBody);

    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: bodyValidation.error.format() },
        { status: 400 }
      );
    }

    const { noteId, all } = bodyValidation.data;

    if (all) {
      // Fetch notes that have S3 assets to clean up before deleting
      const notesToDelete = await prisma.note.findMany({
        where: {
          notebookId,
          notebook: { userId: user.id },
          type: {
            in: [
              AllowedNoteType.INFOGRAPHIC,
              AllowedNoteType.SLIDE_DECK,
              AllowedNoteType.AUDIO_OVERVIEW,
              AllowedNoteType.VIDEO_OVERVIEW,
            ],
          },
        },
        select: { id: true, type: true, content: true },
      });

      await prisma.note.deleteMany({
        where: {
          notebookId,
          notebook: {
            userId: user.id,
          },
        },
      });

      // Clean up assets for each note and cancel any in-flight generations
      await Promise.allSettled(
        notesToDelete.map((note) => deleteNoteAssets(note.type, note.content))
      );

      await Promise.allSettled(
        notesToDelete.map((note) =>
          inngest.send({
            name: 'note/deleted',
            data: { noteId: note.id },
          })
        )
      ).catch((e) => console.error('[DELETE_ALL_NOTES] Inngest cancel events failed:', e));

      return NextResponse.json({ success: true });
    }

    if (!noteId) {
      return NextResponse.json({ error: 'Missing required field: noteId' }, { status: 400 });
    }

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        notebookId,
        notebook: {
          userId: user.id,
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    await prisma.note.delete({
      where: { id: noteId },
    });

    // Clean up assets directly in the route
    await deleteNoteAssets(note.type, note.content);

    // Fire Inngest cancel event with only noteId
    await inngest
      .send({
        name: 'note/deleted',
        data: {
          noteId,
        },
      })
      .catch((e) => console.error('[DELETE_NOTE] Inngest cancel event failed:', e));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE_NOTES]', error);
    return NextResponse.json({ error: 'Failed to delete notes' }, { status: 500 });
  }
}
