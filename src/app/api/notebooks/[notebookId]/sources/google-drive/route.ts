import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user';
import { notebookIdParamSchema } from '@/validators/sources';
import { inngest } from '@/inngest/client';
import { Status } from '@/generated/prisma/enums';
import { deductCredit } from '@/lib/credits';
import { uploadAsset } from '@/lib/s3';
import { downloadGoogleDriveFile, parseGoogleDriveUrl } from '@/lib/google-drive';

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

    let body: {
      fileId?: string;
      url?: string;
      fileName?: string;
      mimeType?: string;
      accessToken?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
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

    let fileId = body.fileId?.trim() || '';
    let resourceType: 'document' | 'spreadsheet' | 'presentation' | 'file' | undefined;

    if (body.url?.trim()) {
      const parsed = parseGoogleDriveUrl(body.url.trim());
      if (!parsed) {
        return NextResponse.json(
          {
            error:
              'Invalid Google Drive link. Please provide a valid drive.google.com or docs.google.com URL.',
          },
          { status: 400 }
        );
      }
      fileId = parsed.fileId;
      resourceType = parsed.resourceType;
    }

    if (!fileId) {
      return NextResponse.json(
        { error: 'Either a valid fileId or Google Drive URL is required.' },
        { status: 400 }
      );
    }

    // Try finding stored Google access token if not passed in request body
    let token = body.accessToken?.trim() || '';
    if (!token) {
      const googleAccount = await prisma.account.findFirst({
        where: {
          userId: user.id,
          providerId: 'google',
        },
      });
      if (googleAccount?.accessToken) {
        token = googleAccount.accessToken;
      }
    }

    // Deduct user credit before processing
    const hasCredit = await deductCredit(user.id);
    if (!hasCredit) {
      return NextResponse.json(
        { error: 'Credits exhausted. Please wait for the daily reset.' },
        { status: 403 }
      );
    }

    // Download or export file from Google Drive
    const downloaded = await downloadGoogleDriveFile({
      fileId,
      resourceType,
      knownFileName: body.fileName?.trim(),
      knownMimeType: body.mimeType?.trim(),
      accessToken: token || undefined,
    });

    // Upload to S3 storage bucket
    const uploadedAsset = await uploadAsset({
      buffer: downloaded.buffer,
      folder: 'sources',
      extension: downloaded.extension,
      contentType: downloaded.contentType,
    });

    // Create Source record in DB
    const source = await prisma.source.create({
      data: {
        sourceTitle: downloaded.fileName,
        type: downloaded.sourceType,
        status: Status.PROCESSING,
        notebook: { connect: { id: notebookId } },
        file: {
          create: {
            path: uploadedAsset.path,
            contentType: downloaded.contentType,
          },
        },
      },
      include: { file: true },
    });

    // Dispatch Inngest source processing pipeline
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
    console.error('[IMPORT_GOOGLE_DRIVE_SOURCE]', error);
    const message = error instanceof Error ? error.message : 'Failed to import Google Drive file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
