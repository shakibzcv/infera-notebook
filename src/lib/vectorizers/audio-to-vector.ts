import { AudioTranscriptLoader } from '@langchain/community/document_loaders/web/assemblyai';
import { ASSEMBLY_API_KEY } from '@/lib/env';
import type { Document } from '@langchain/core/documents';

export async function audioToVector(url: string): Promise<Document[]> {
  try {
    const loader = new AudioTranscriptLoader({ audio: url }, { apiKey: ASSEMBLY_API_KEY });
    return await loader.load();
  } catch (error) {
    throw new Error(`Failed to convert Audio/Video to vector: ${error}`);
  }
}
