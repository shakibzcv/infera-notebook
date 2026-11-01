import { JSONLoader } from '@langchain/classic/document_loaders/fs/json';
import { fetchSource } from './utils';
import type { Document } from '@langchain/core/documents';

export async function jsonToVector(url: string): Promise<Document[]> {
  try {
    const blob = await fetchSource(url);
    const loader = new JSONLoader(blob);
    return await loader.load();
  } catch (error) {
    throw new Error(`Failed to convert JSON to vector: ${error}`);
  }
}
