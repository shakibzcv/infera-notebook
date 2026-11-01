import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { fetchSource } from './utils';
import type { Document } from '@langchain/core/documents';

export async function pdfToVector(url: string): Promise<Document[]> {
  try {
    const blob = await fetchSource(url);
    const loader = new PDFLoader(blob);
    return await loader.load();
  } catch (error) {
    throw new Error(`Failed to convert PDF to vector: ${error}`);
  }
}
