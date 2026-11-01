import { getSignedDownloadUrl } from '@/lib/s3';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * S3/R2 Signed URL API
 * Handles generating secure, temporary URLs for reading/viewing assets.
 */

/**
 * Helper to check if the current user is authorized to access a given S3 path.
 */
async function isAuthorizedForPath(
  userId: string,
  userImage: string | null | undefined,
  path: string
): Promise<boolean> {
  if (!path) return false;

  // 1. Direct path conventions / user avatar
  if (
    path.startsWith(`users/${userId}/`) ||
    path.startsWith(`profile-images/${userId}`) ||
    (userImage && path === userImage)
  ) {
    return true;
  }

  // 2. Check if path corresponds to a File owned by user (via Source -> Notebook)
  const fileRecord = await prisma.file.findFirst({
    where: {
      path: path,
      source: {
        notebook: {
          userId: userId,
        },
      },
    },
    select: { id: true },
  });

  if (fileRecord) {
    return true;
  }

  // 3. Check if path is embedded in Note content owned by user (e.g., audio/video/infographic assets)
  const noteRecord = await prisma.note.findFirst({
    where: {
      notebook: {
        userId: userId,
      },
      content: {
        contains: path,
      },
    },
    select: { id: true },
  });

  if (noteRecord) {
    return true;
  }

  return false;
}

// Generate signed DOWNLOAD/VIEW URL(s)
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const pathsParam = searchParams.get('paths');
    const expiresIn = parseInt(searchParams.get('expiresIn') || '3600');

    if (!path && !pathsParam) {
      return NextResponse.json({ error: 'Missing path or paths parameter' }, { status: 400 });
    }

    const userId = session.user.id;
    const userImage = session.user.image;

    if (pathsParam) {
      const paths = pathsParam.split(',').filter(Boolean);

      for (const p of paths) {
        const authorized = await isAuthorizedForPath(userId, userImage, p);
        if (!authorized) {
          return NextResponse.json(
            { error: `Forbidden: Access to file path '${p}' is denied` },
            { status: 403 }
          );
        }
      }

      const urls = await Promise.all(
        paths.map(async (p) => ({
          path: p,
          signedUrl: await getSignedDownloadUrl(p, expiresIn),
        }))
      );
      return NextResponse.json({ urls });
    }

    const authorized = await isAuthorizedForPath(userId, userImage, path!);
    if (!authorized) {
      return NextResponse.json(
        { error: `Forbidden: Access to file path '${path}' is denied` },
        { status: 403 }
      );
    }

    const signedUrl = await getSignedDownloadUrl(path!, expiresIn);
    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error('Error generating signed download URL:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Generate batch signed DOWNLOAD URL(s) via PATCH (for large lists)
export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paths, expiresIn = 3600 } = await request.json();

    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid paths array' }, { status: 400 });
    }

    const userId = session.user.id;
    const userImage = session.user.image;

    for (const p of paths) {
      if (typeof p !== 'string') continue;
      const authorized = await isAuthorizedForPath(userId, userImage, p);
      if (!authorized) {
        return NextResponse.json(
          { error: `Forbidden: Access to file path '${p}' is denied` },
          { status: 403 }
        );
      }
    }

    const urls = await Promise.all(
      paths.map(async (p: string) => ({
        path: p,
        signedUrl: await getSignedDownloadUrl(p, expiresIn),
      }))
    );

    return NextResponse.json({ urls });
  } catch (error) {
    console.error('Error generating batch signed download URLs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
