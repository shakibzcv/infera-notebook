import { deleteFile, uploadAsset, getSignedDownloadUrl, getPresignedUploadUrl } from '@/lib/s3';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import * as env from '@/lib/env';

/**
 * S3/R2 Presigned Upload API
 * Handles generating presigned URLs specifically for client-side uploads.
 */

// Generate a presigned UPLOAD URL
export async function POST(request: Request) {
  try {
    const { contentType, folder = 'uploads', customPath } = await request.json();

    if (!contentType && !customPath) {
      return NextResponse.json({ error: 'Missing contentType or customPath' }, { status: 400 });
    }

    // Authentication: Get the current user session
    const { auth } = await import('@/lib/auth');
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Use customPath if provided, otherwise generate a unique one
    let path = customPath;
    if (!path) {
      const fileExtension = contentType?.split('/')[1] || 'bin';
      path = `${folder}/${uuidv4()}.${fileExtension}`;
    } else {
      // Security: Sanitize path and enforce prefix
      const sanitizedPath = customPath.replace(/\.\.\//g, '').replace(/^\/+/, '');
      path = `users/${userId}/${sanitizedPath}`;
    }

    const uploadUrl = await getPresignedUploadUrl(path, contentType || 'application/octet-stream');

    return NextResponse.json({
      uploadUrl,
      path,
    });
  } catch (error) {
    console.error('Error generating presigned upload URL:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
