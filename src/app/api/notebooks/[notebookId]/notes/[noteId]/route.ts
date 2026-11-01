/**
 * Single Note Detail API
 * Handles operations on individual notes, including full content retrieval and updates.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user';
import { notebookNoteParamsSchema, updateNoteBodySchema } from '@/validators/notes';
import { Status } from '@/generated/prisma/enums';
import { resolveNoteAssets } from '@/lib/note-utils';

/**
 * GET Handler
 * Fetches the complete record of a note, including its serialized content.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ notebookId: string; noteId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId: rawNotebookId, noteId } = await params;

    const paramValidation = notebookNoteParamsSchema.safeParse({
      notebookId: rawNotebookId,
      noteId,
    });

    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: paramValidation.error.format(),
        },
        { status: 400 }
      );
    }

    const { notebookId, noteId: validatedNoteId } = paramValidation.data;

    const note = await prisma.note.findFirst({
      where: {
        id: validatedNoteId,
        notebookId,
      },
      include: {
        sources: true,
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const resolvedNote = await resolveNoteAssets(note);

    return NextResponse.json({ note: resolvedNote });
  } catch (error) {
    console.error('[GET_NOTE_DETAIL]', error);
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ notebookId: string; noteId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId: rawNotebookId, noteId } = await params;

    const paramValidation = notebookNoteParamsSchema.safeParse({
      notebookId: rawNotebookId,
      noteId,
    });

    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: paramValidation.error.format(),
        },
        { status: 400 }
      );
    }

    const { notebookId, noteId: validatedNoteId } = paramValidation.data;

    // Verify notebook belongs to user
    const notebook = await prisma.notebook.findFirst({
      where: {
        id: notebookId,
        userId: user.id,
      },
    });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    // Verify note belongs to notebook
    const note = await prisma.note.findFirst({
      where: {
        id: validatedNoteId,
        notebookId,
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const jsonBody = await request.json();
    const bodyValidation = updateNoteBodySchema.safeParse({
      ...jsonBody,
      noteTitle: jsonBody.title, // Mapping title to noteTitle as per schema
    });

    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: bodyValidation.error.format() },
        { status: 400 }
      );
    }

    const { noteTitle, content, status } = bodyValidation.data;

    const updateData: {
      noteTitle?: string;
      content?: string;
      status?: Status;
    } = {};

    if (noteTitle) updateData.noteTitle = noteTitle;
    if (content !== undefined) updateData.content = content;
    if (status) updateData.status = status;

    // If content is being updated and note was processing, mark as success
    if (content !== undefined && note.status === Status.PROCESSING) {
      updateData.status = Status.SUCCESS;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updatedNote = await prisma.note.update({
      where: { id: validatedNoteId },
      data: updateData,
    });

    return NextResponse.json({ note: updatedNote });
  } catch (error) {
    console.error('[UPDATE_NOTE]', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}
