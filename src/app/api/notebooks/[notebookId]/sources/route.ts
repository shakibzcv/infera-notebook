/**
 * Notebook Sources Controller
 * Manages the attachments (PDFs, Links, etc.) linked to a specific notebook.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user';
import { notebookIdParamSchema, createSourceBodySchema } from '@/validators/sources';
import { inngest } from '@/inngest/client';
import { Status } from '@/generated/prisma/enums';
import { deductCredit } from '@/lib/credits';

/**
 * GET Handler
 * Returns all sources associated with a notebook, ordered by most recent.
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

    const sources = await prisma.source.findMany({
      where: { notebookId },
      include: { file: true },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error('[GET_SOURCES_BY_NOTEBOOK]', error);
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
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

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Validate request body
    const bodyValidation = createSourceBodySchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: bodyValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const { sourceTitle, type, file } = bodyValidation.data;

    const isYouTube =
      type === 'YOUTUBE' || file.path.includes('youtube.com') || file.path.includes('youtu.be');

    if (isYouTube) {
      return NextResponse.json(
        {
          error:
            'Adding sources via YouTube URL is not supported. Please paste the transcript directly.',
        },
        { status: 400 }
      );
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

    // Deduct credit for file upload
    const success = await deductCredit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Credits exhausted. Please wait for the daily reset.' },
        { status: 403 }
      );
    }

    const source = await prisma.source.create({
      data: {
        sourceTitle,
        type,
        status: Status.PROCESSING,
        notebook: { connect: { id: notebookId } },
        file: {
          create: {
            path: file.path,
            contentType: file.contentType,
          },
        },
      },
      include: { file: true },
    });

    // Send event to Inngest for processing
    await inngest.send({
      name: 'notebook/source-process',
      data: {
        sourceId: source.id,
        notebookId: source.notebookId,
        type: source.type,
        sourceTitle: source.sourceTitle,
        url: source.file.path,
        userId: user.id,
      },
    });

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error('[CREATE_SOURCE]', error);
    return NextResponse.json({ error: 'Failed to create source' }, { status: 500 });
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

    const { notebookId: rawNotebookId } = await params;
    const paramValidation = notebookIdParamSchema.safeParse({ notebookId: rawNotebookId });

    if (!paramValidation.success) {
      return NextResponse.json({ error: 'Invalid notebook ID' }, { status: 400 });
    }

    const { notebookId } = paramValidation.data;

    const notebook = await prisma.notebook.findFirst({
      where: { id: notebookId, userId: user.id },
    });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    // 1. Get all sources to clean up
    const sources = await prisma.source.findMany({
      where: { notebookId },
      include: { file: true },
    });

    const fileIds = sources.map((s) => s.fileId).filter(Boolean);

    // 2. Delete Sources from Database immediately so UI updates instantly
    await prisma.source.deleteMany({
      where: { notebookId },
    });

    // 3. Delete orphaned File records from Database
    if (fileIds.length > 0) {
      await prisma.file
        .deleteMany({
          where: { id: { in: fileIds } },
        })
        .catch((e) => console.warn('[DELETE_ALL_SOURCES] File cleanup warning:', e));
    }

    // 4. Dispatch Inngest cleanup events for each source (Pinecone vectors, S3 storage, job cancellation)
    await Promise.allSettled(
      sources.map((source) =>
        inngest.send({
          name: 'source/deleted',
          data: {
            sourceId: source.id,
            filePath: source.file?.path,
            fileId: source.fileId,
          },
        })
      )
    ).catch((err) => console.error('[DELETE_ALL_SOURCES] Inngest dispatch failed:', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE_ALL_SOURCES]', error);
    return NextResponse.json({ error: 'Failed to delete sources' }, { status: 500 });
  }
}
