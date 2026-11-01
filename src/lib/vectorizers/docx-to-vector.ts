import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { fetchSource } from './utils';
import type { Document } from '@langchain/core/documents';

export async function docxToVector(url: string): Promise<Document[]> {
  try {
    const blob = await fetchSource(url);
    const loader = new DocxLoader(blob);
    return await loader.load();
  } catch (error) {
    throw new Error(`Failed to convert DOCX to vector: ${error}`);
  }
}
