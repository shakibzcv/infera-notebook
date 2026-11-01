import { SRTLoader } from '@langchain/community/document_loaders/fs/srt';
import { fetchSource } from './utils';
import type { Document } from '@langchain/core/documents';

export async function srtToVector(url: string): Promise<Document[]> {
  try {
    const blob = await fetchSource(url);
    const loader = new SRTLoader(blob);
    return await loader.load();
  } catch (error) {
    throw new Error(`Failed to convert SRT to vector: ${error}`);
  }
}
