/**
 * Single Notebook Instance API
 * Handles operations on a specific notebook identified by its UUID.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user';
import { inngest } from '@/inngest/client';

/**
 * GET Handler
 * Retrieves the basic metadata for a specific notebook.
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

    const { notebookId } = await params;
    if (!notebookId) {
      return NextResponse.json({ error: 'Notebook ID is required' }, { status: 400 });
    }

    const notebook = await prisma.notebook.findFirst({
      where: {
        id: notebookId,
        userId: user.id,
      },
    });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    return NextResponse.json({ notebook });
  } catch (error) {
    console.error('[GET_NOTEBOOK_BY_ID]', error);
    return NextResponse.json({ error: 'Failed to fetch notebook' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ notebookId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId } = await params;
    if (!notebookId) {
      return NextResponse.json({ error: 'Notebook ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const title =
      typeof body?.title === 'string' && body.title.trim().length > 0 ? body.title.trim() : null;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const notebook = await prisma.notebook.findFirst({
      where: {
        id: notebookId,
        userId: user.id,
      },
    });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const updatedNotebook = await prisma.notebook.update({
      where: { id: notebookId },
      data: { title },
    });

    return NextResponse.json({ notebook: updatedNotebook });
  } catch (error) {
    console.error('[UPDATE_NOTEBOOK]', error);
    return NextResponse.json({ error: 'Failed to update notebook' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ notebookId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId } = await params;
    if (!notebookId) {
      return NextResponse.json({ error: 'Notebook ID is required' }, { status: 400 });
    }

    const notebook = await prisma.notebook.findFirst({
      where: {
        id: notebookId,
        userId: user.id,
      },
    });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    // 1. Fetch all sources to clean up external storage and orphaned files
    const sources = await prisma.source.findMany({
      where: { notebookId, notebook: { userId: user.id } },
      include: { file: true },
    });

    const fileIds = sources.map((s) => s.fileId).filter(Boolean);

    // 2. Fetch all notes to clean up external storage and pending generations
    const notes = await prisma.note.findMany({
      where: {
        notebookId,
        notebook: { userId: user.id },
      },
      select: {
        id: true,
        type: true,
        content: true,
      },
    });

    // 3. Delete the notebook (database cascade deletes will handle notes, sources, chats, messages)
    await prisma.notebook.delete({
      where: { id: notebookId },
    });

    // 4. Delete orphaned File records from database
    if (fileIds.length > 0) {
      await prisma.file
        .deleteMany({
          where: { id: { in: fileIds } },
        })
        .catch((e) => console.warn('[DELETE_NOTEBOOK] File cleanup warning:', e));
    }

    // 5. Offload all background cleanup to Inngest (Pinecone vectors, S3 storage, job cancellation)
    await inngest
      .send({
        name: 'notebook/deleted',
        data: {
          notebookId,
          sources: sources.map((s) => ({ id: s.id, filePath: s.file?.path })),
          notes: notes.map((n) => ({ id: n.id, type: n.type, content: n.content })),
          fileIds,
        },
      })
      .catch((e) =>
        console.error('[DELETE_NOTEBOOK] Failed to dispatch Inngest cleanup event:', e)
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE_NOTEBOOK]', error);
    return NextResponse.json({ error: 'Failed to delete notebook' }, { status: 500 });
  }
}
