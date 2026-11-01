import { JSONLinesLoader } from '@langchain/classic/document_loaders/fs/json';
import { fetchSource } from './utils';
import type { Document } from '@langchain/core/documents';

export async function jsonLinesToVector(url: string): Promise<Document[]> {
  try {
    const blob = await fetchSource(url);
    const loader = new JSONLinesLoader(blob, '/html');
    return await loader.load();
  } catch (error) {
    throw new Error(`Failed to convert JSONL to vector: ${error}`);
  }
}
