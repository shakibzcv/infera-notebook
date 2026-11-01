import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user';
import { listGoogleDriveFiles } from '@/lib/google-drive';

export async function GET(
  request: Request,
  { params: _params }: { params: Promise<{ notebookId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const headerToken = request.headers.get('x-google-access-token');
    const paramToken = searchParams.get('token');

    let token = headerToken || paramToken || '';

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

    if (!token) {
      return NextResponse.json(
        {
          files: [],
          needsAuth: true,
          error: 'Google Drive authorization required',
        },
        { status: 401 }
      );
    }

    const folderId = searchParams.get('folderId') || 'root';

    const files = await listGoogleDriveFiles({
      accessToken: token,
      query: query || undefined,
      folderId: folderId || 'root',
      pageSize: 60,
    });

    return NextResponse.json({ files, needsAuth: false });
  } catch (error) {
    console.error('[LIST_GOOGLE_DRIVE_FILES]', error);
    const isAuthError =
      error instanceof Error &&
      (error.message.includes('401') ||
        error.message.toLowerCase().includes('unauthenticated') ||
        error.message.toLowerCase().includes('invalid_grant') ||
        error.message.toLowerCase().includes('invalid credentials'));

    const message = error instanceof Error ? error.message : 'Failed to list Google Drive files';

    return NextResponse.json(
      {
        error: message,
        files: [],
        needsAuth: isAuthError,
      },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
