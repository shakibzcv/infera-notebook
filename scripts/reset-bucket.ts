import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import type {
  ListObjectsV2CommandOutput,
  DeleteObjectsCommandOutput,
  _Object,
} from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

// Load environment variables from the root .env file
dotenv.config();

const region = process.env.AWS_REGION || 'auto';
const bucketName = process.env.AWS_S3_BUCKET_NAME;
const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.AWS_ENDPOINT;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!bucketName || !accessKeyId || !secretAccessKey) {
  console.error(
    '\x1b[31m%s\x1b[0m',
    'Error: Missing required environment variables (AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY).'
  );
  process.exit(1);
}

const forcePathStyle =
  process.env.AWS_FORCE_PATH_STYLE === 'true' ||
  (process.env.AWS_FORCE_PATH_STYLE !== 'false' && Boolean(endpoint));

const s3Client = new S3Client({
  region: region,
  endpoint: endpoint,
  forcePathStyle: forcePathStyle,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

/**
 * S3/R2 Bucket Reset Script
 * Empties all objects from the configured storage bucket to return it to a clean slate,
 * while preserving the bucket itself and its configuration.
 */
async function resetBucket() {
  console.log('\n\x1b[36m%s\x1b[0m', '--- S3/R2 Storage Bucket Reset Start ---');
  console.log(`Target Bucket: ${bucketName}`);
  console.log(`Region: ${region}`);
  if (endpoint) console.log(`Endpoint: ${endpoint}`);

  try {
    // 1. Verify bucket exists and is accessible
    console.log(`Checking bucket accessibility...`);
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      console.log(`✅ Bucket "${bucketName}" is accessible.`);
    } catch (headError: any) {
      if (headError.name === 'NotFound' || headError.$metadata?.httpStatusCode === 404) {
        console.error(
          '\x1b[31m%s\x1b[0m',
          `❌ Error: Bucket "${bucketName}" does not exist. Nothing to reset.`
        );
        process.exit(1);
      }
      throw headError;
    }

    // 2. Iterate and delete all objects (supporting pagination for large buckets)
    console.log(`Scanning and deleting objects from "${bucketName}"...`);
    let totalDeleted = 0;
    let continuationToken: string | undefined = undefined;

    do {
      const listResult: ListObjectsV2CommandOutput = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          ContinuationToken: continuationToken,
        })
      );
      const objects: _Object[] | undefined = listResult.Contents;

      if (objects && objects.length > 0) {
        const deleteParams = {
          Bucket: bucketName,
          Delete: {
            Objects: objects
              .filter((obj: _Object) => Boolean(obj.Key))
              .map((obj: _Object) => ({ Key: obj.Key! })),
            Quiet: false,
          },
        };

        const deleteResult: DeleteObjectsCommandOutput = await s3Client.send(
          new DeleteObjectsCommand(deleteParams)
        );
        const deletedCount = deleteResult.Deleted?.length ?? 0;
        totalDeleted += deletedCount;

        console.log(`Deleted batch of ${deletedCount} object(s).`);

        if (deleteResult.Errors && deleteResult.Errors.length > 0) {
          console.warn('⚠️ Some objects could not be deleted:');
          console.table(deleteResult.Errors);
        }
      }

      continuationToken = listResult.NextContinuationToken;
    } while (continuationToken);

    if (totalDeleted === 0) {
      console.log('ℹ️ Bucket was already empty. No objects found.');
    } else {
      console.log(`✅ Successfully cleared a total of ${totalDeleted} object(s).`);
    }

    console.log('\n\x1b[32m%s\x1b[0m', '--- S3/R2 Storage Bucket Reset Complete! ---');
  } catch (error) {
    console.error('\n\x1b[31m%s\x1b[0m', '❌ Error during bucket reset:');
    console.error(error);
    process.exit(1);
  }
}

resetBucket();
