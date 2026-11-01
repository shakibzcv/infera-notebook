import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user';
import { inngest } from '@/inngest/client';
import { Status } from '@/generated/prisma/enums';
import { notebookIdParamSchema, sourceIdParamSchema } from '@/validators/sources';

/**
 * Source Retry Route
 * Allows users to re-trigger the ingestion and vectorization process
 * for a source that previously failed.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ notebookId: string; sourceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId: rawNotebookId, sourceId: rawSourceId } = await params;

    // Validate parameters
    const notebookValidation = notebookIdParamSchema.safeParse({ notebookId: rawNotebookId });
    const sourceValidation = sourceIdParamSchema.safeParse({ sourceId: rawSourceId });

    if (!notebookValidation.success || !sourceValidation.success) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const { notebookId } = notebookValidation.data;
    const { sourceId } = sourceValidation.data;

    // Verify notebook ownership and source existence
    const source = await prisma.source.findFirst({
      where: {
        id: sourceId,
        notebookId,
        notebook: {
          userId: user.id,
        },
      },
      include: { file: true },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Reset status to PROCESSING
    const updatedSource = await prisma.source.update({
      where: { id: sourceId },
      data: { status: Status.PROCESSING },
    });

    // Re-trigger Inngest event for processing
    await inngest.send({
      name: 'notebook/source-process',
      data: {
        sourceId: updatedSource.id,
        notebookId: updatedSource.notebookId,
        type: updatedSource.type,
        sourceTitle: updatedSource.sourceTitle,
        url: source.file.path,
        userId: user.id,
      },
    });

    return NextResponse.json({ source: updatedSource });
  } catch (error) {
    console.error('[RETRY_SOURCE]', error);
    return NextResponse.json({ error: 'Failed to retry source' }, { status: 500 });
  }
}
