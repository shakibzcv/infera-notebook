/**
 * Single Source Instance API
 * Handles specific source operations like title updates and deletion.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user';

import {
  notebookIdParamSchema,
  sourceIdParamSchema,
  updateSourceTitleBodySchema,
} from '@/validators/sources';
import { inngest } from '@/inngest/client';

/**
 * PATCH Handler
 * Updates the title of a specific source.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ notebookId: string; sourceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId: rawNotebookId, sourceId: rawSourceId } = await params;

    const notebookValidation = notebookIdParamSchema.safeParse({
      notebookId: rawNotebookId,
    });
    const sourceValidation = sourceIdParamSchema.safeParse({
      sourceId: rawSourceId,
    });

    if (!notebookValidation.success || !sourceValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: {
            notebookIssues: notebookValidation.success ? null : notebookValidation.error.issues,
            sourceIssues: sourceValidation.success ? null : sourceValidation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { notebookId } = notebookValidation.data;
    const { sourceId } = sourceValidation.data;

    // Ensure notebook belongs to user
    const notebook = await prisma.notebook.findFirst({
      where: {
        id: notebookId,
        userId: user.id,
      },
    });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    // Parse and validate body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const bodyValidation = updateSourceTitleBodySchema.safeParse(body);
    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: bodyValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const { sourceTitle } = bodyValidation.data;

    const source = await prisma.source.updateMany({
      where: {
        id: sourceId,
        notebookId,
      },
      data: {
        sourceTitle,
      },
    });

    if (source.count === 0) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const updated = await prisma.source.findUnique({
      where: { id: sourceId },
    });

    return NextResponse.json({ source: updated });
  } catch (error) {
    console.error('[UPDATE_SOURCE_TITLE]', error);
    return NextResponse.json({ error: 'Failed to update source title' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ notebookId: string; sourceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId: rawNotebookId, sourceId: rawSourceId } = await params;

    const notebookValidation = notebookIdParamSchema.safeParse({
      notebookId: rawNotebookId,
    });
    const sourceValidation = sourceIdParamSchema.safeParse({
      sourceId: rawSourceId,
    });

    if (!notebookValidation.success || !sourceValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: {
            notebookIssues: notebookValidation.success ? null : notebookValidation.error.issues,
            sourceIssues: sourceValidation.success ? null : sourceValidation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { notebookId } = notebookValidation.data;
    const { sourceId } = sourceValidation.data;

    // Ensure notebook belongs to user
    const notebook = await prisma.notebook.findFirst({
      where: {
        id: notebookId,
        userId: user.id,
      },
    });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const source = await prisma.source.findUnique({
      where: { id: sourceId, notebookId },
      include: { file: true },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const fileId = source.fileId;
    const filePath = source.file?.path;

    // 1. Delete Source from Database immediately so UI updates instantly
    await prisma.source.delete({
      where: { id: sourceId },
    });

    // 2. Delete associated File record from Database
    if (fileId) {
      await prisma.file
        .delete({
          where: { id: fileId },
        })
        .catch((fileErr) => {
          console.warn('[DELETE_SOURCE] File record cleanup warning:', fileErr);
        });
    }

    // 3. Offload external cleanup (Pinecone vectors, S3 storage, cancellation) to Inngest
    await inngest
      .send({
        name: 'source/deleted',
        data: {
          sourceId,
          filePath,
          fileId,
        },
      })
      .catch((inngestErr) => {
        console.error('[DELETE_SOURCE] Failed to dispatch Inngest cleanup event:', inngestErr);
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE_SOURCE]', error);
    return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 });
  }
}
