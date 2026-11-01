import type { Document } from '@langchain/core/documents';

export type SourceVectorizer = (url: string) => Promise<Document[]>;

/**
 * Fetches a remote source URL and returns it as a Blob.
 * Shared utility for file-based vectorizers.
 */
export async function fetchSource(url: string): Promise<Blob> {
  const response = await fetch(url);
  const data = await response.arrayBuffer();
  return new Blob([data]);
}
