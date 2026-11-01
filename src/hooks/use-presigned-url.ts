'use client';

import { useSignedUrls } from './use-signed-urls';

/**
 * Hook to resolve an S3 path (object key) into a usable presigned URL.
 * Backed by the unified useSignedUrls global cache with batching and deduplication.
 *
 * @param path - The S3 path (key) stored in the user's image field.
 * @returns { url: string | null; isLoading: boolean; error: Error | null }
 */
export function usePresignedUrl(path: string | null | undefined) {
  const resolvedPath = path || '';
  const { urls, loading, error } = useSignedUrls(resolvedPath ? [resolvedPath] : []);

  if (!path) {
    return { url: null, isLoading: false, error: null };
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return { url: path, isLoading: false, error: null };
  }

  const url = urls[path] || null;
  return {
    url,
    isLoading: loading,
    error: error ? new Error(error) : null,
  };
}
