import type { Document } from '@langchain/core/documents';

export type SourceVectorizer = (url: string) => Promise<Document[]>;

/**
 * Fetches a remote source URL and returns it as a Blob.
 * Shared utility for file-based vectorizers.
 */
export async function fetchSource(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch source from ${url}: ${response.status} ${response.statusText}`
    );
  }
  const data = await response.arrayBuffer();
  return new Blob([data]);
}
