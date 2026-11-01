import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import { fetchSource } from './utils';
import type { Document } from '@langchain/core/documents';

export async function csvToVector(url: string): Promise<Document[]> {
  try {
    const blob = await fetchSource(url);
    const loader = new CSVLoader(blob);
    return await loader.load();
  } catch (error) {
    throw new Error(`Failed to convert CSV to vector: ${error}`);
  }
}
