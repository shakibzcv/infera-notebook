import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as env from '@/lib/env';
import { v4 as uuidv4 } from 'uuid';

let s3Client: S3Client | null = null;

/**
 * Returns the underlying S3 client instance.
 */
export function getS3Client(): S3Client {
  if (!s3Client) {
    const region = env.AWS_REGION!;
    const bucket = env.AWS_S3_BUCKET_NAME!;
    const endpoint = env.AWS_ENDPOINT_URL_S3;

    if (!region || !bucket) {
      throw new Error(
        'S3 Configuration error: AWS_REGION and AWS_S3_BUCKET_NAME must be defined in environment variables.'
      );
    }

    s3Client = new S3Client({
      region,
      ...(endpoint && { endpoint }),
      forcePathStyle: env.AWS_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

/**
 * Constructs the internal URL for an object path.
 */
export function _getInternalUrl(path: string): string {
  const region = env.AWS_REGION!;
  const bucket = env.AWS_S3_BUCKET_NAME!;
  const endpoint = env.AWS_ENDPOINT_URL_S3;

  const baseUrl = endpoint
    ? `${endpoint.replace(/\/$/, '')}/${bucket}`
    : `https://${bucket}.s3.${region}.amazonaws.com`;

  return `${baseUrl}/${path}`;
}

/**
 * Universal asset uploader.
 * Generates a unique path with the bucket prefix and uploads the buffer.
 */
export async function uploadAsset({
  buffer,
  folder,
  extension,
  contentType,
}: {
  buffer: Buffer;
  folder: string;
  extension: string;
  contentType: string;
}): Promise<{ path: string }> {
  const path = `${folder}/${uuidv4()}.${extension}`;
  await uploadBuffer(buffer, path, contentType);
  return { path };
}

/**
 * Uploads a buffer directly to the bucket from the server.
 */
export async function uploadBuffer(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME!,
    Key: path,
    Body: buffer,
    ContentType: contentType,
  });

  await getS3Client().send(command);

  return _getInternalUrl(path);
}

/**
 * Generates a presigned URL for secure client-side uploading.
 */
export async function getPresignedUploadUrl(
  path: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME!,
    Key: path,
    ContentType: contentType,
  });

  return await getSignedUrl(getS3Client(), command, { expiresIn });
}

/**
 * Generates a signed URL for secure client-side downloading/viewing.
 */
export async function getSignedDownloadUrl(path: string, expiresIn = 3600): Promise<string> {
  if (path.startsWith('http')) {
    return path;
  }

  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME!,
    Key: path,
  });

  return await getSignedUrl(getS3Client(), command, { expiresIn });
}

/**
 * Deletes an object from the bucket.
 */
export async function deleteFile(path: string): Promise<void> {
  if (
    !path ||
    typeof path !== 'string' ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET_NAME!,
      Key: path,
    });

    await getS3Client().send(command);
  } catch (error) {
    console.error(`[S3_DELETE_FILE_ERROR] Failed to delete file at path "${path}":`, error);
  }
}

/**
 * Deletes all S3 storage objects associated with a source (raw file + extracted-text cache).
 */
export async function deleteSourceStorage(
  sourceId: string,
  filePath?: string | null
): Promise<void> {
  const promises: Promise<void>[] = [deleteFile(`extracted-text/${sourceId}.txt`)];
  if (filePath) {
    promises.push(deleteFile(filePath));
  }
  await Promise.allSettled(promises);
}

/**
 * Retrieves the raw text content of an object from S3.
 * Returns null if the object does not exist or fails to load.
 */
export async function getObjectText(path: string): Promise<string | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: env.AWS_S3_BUCKET_NAME!,
      Key: path,
    });

    const response = await getS3Client().send(command);
    if (!response.Body) return null;
    return await response.Body.transformToString();
  } catch (error) {
    return null;
  }
}
