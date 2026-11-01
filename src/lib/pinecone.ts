import { Pinecone as PineconeClient } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import * as env from '@/lib/env';
import { vectorEmbeddings } from '@/lib/llm';

let pineconeClient: PineconeClient | null = null;

/**
 * Returns the underlying Pinecone client instance.
 */
export function getPineconeClient() {
  if (!pineconeClient) {
    pineconeClient = new PineconeClient({
      apiKey: env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

/**
 * Returns the configured Pinecone index for vector operations.
 */
export function getPineconeIndex() {
  const client = getPineconeClient();
  return client.Index(env.PINECONE_INDEX!);
}

/**
 * Initializes the Pinecone vector store wrapper for LangChain.
 * Connects the BGE-M3 embeddings model with the Pinecone index for similarity searches.
 *
 * @returns An initialized PineconeStore instance.
 * @throws Error if initialization or index connection fails.
 */
export async function initializeVectorStore() {
  try {
    const embeddings = vectorEmbeddings;
    const pineconeIndex = getPineconeIndex();

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
      maxConcurrency: 5,
    });

    if (!vectorStore) {
      throw new Error('Failed to initialize vector store');
    }

    return vectorStore;
  } catch (error) {
    console.error('[PINECONE_SERVICE_ERROR]', error);
    if (error instanceof Error) {
      throw new Error(`Vector store initialization failed: ${error.message}`);
    }
    throw new Error('Vector store initialization failed: Unknown error');
  }
}
