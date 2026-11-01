import { PPTXLoader } from '@langchain/community/document_loaders/fs/pptx';
import { fetchSource } from './utils';
import type { Document } from '@langchain/core/documents';

export async function pptxToVector(url: string): Promise<Document[]> {
  try {
    const blob = await fetchSource(url);
    const loader = new PPTXLoader(blob);
    return await loader.load();
  } catch (error) {
    throw new Error(`Failed to convert PPTX to vector: ${error}`);
  }
}
