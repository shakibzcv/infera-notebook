import { TextLoader } from '@langchain/classic/document_loaders/fs/text';
import { fetchSource } from './utils';
import type { Document } from '@langchain/core/documents';

export async function txtToVector(url: string): Promise<Document[]> {
  try {
    const blob = await fetchSource(url);
    const loader = new TextLoader(blob);
    return await loader.load();
  } catch (error) {
    throw new Error(`Failed to convert TXT to vector: ${error}`);
  }
}
