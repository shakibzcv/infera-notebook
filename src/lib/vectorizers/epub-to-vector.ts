import { EPubLoader } from '@langchain/community/document_loaders/fs/epub';
import { fetchSource } from './utils';
import type { Document } from '@langchain/core/documents';

export async function epubToVector(url: string): Promise<Document[]> {
  try {
    const blob = await fetchSource(url);
    const loader = new EPubLoader(blob as any);
    return await loader.load();
  } catch (error) {
    throw new Error(`Failed to convert EPUB to vector: ${error}`);
  }
}
