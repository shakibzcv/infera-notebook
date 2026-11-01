import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import {
  EMBEDDING_MODEL_ID,
  GEMINI_EMBEDDING_BATCH_SIZE,
  GEMINI_EMBEDDING_DIMENSIONALITY,
} from '@/lib/constants';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from './config';
import {
  EMBEDDING_ROUTER_MODELS,
  orderChainByHealth,
  recordModelSuccess,
  recordModelFailure,
  isAbortError,
  isAuthError,
  isRetryableModelError,
} from './model-router';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes an embedding call with the single embedding model.
 */
async function embedWithRouter(
  google: GoogleGenAI,
  content: string,
  modelChain: readonly string[] = EMBEDDING_ROUTER_MODELS
): Promise<number[]> {
  const model = modelChain[0] || EMBEDDING_MODEL_ID;
  const response = await google.models.embedContent({
    model,
    contents: content,
    config: { outputDimensionality: GEMINI_EMBEDDING_DIMENSIONALITY },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error(`Model "${model}" returned empty embedding vector.`);
  }

  return values;
}

/**
 * Gemini Embedding - Query (Asymmetric)
 * Uses the 'search_query' task type instruction as recommended for Gemini embeddings.
 * Dynamically cascades through EMBEDDING_ROUTER_MODELS if the primary model fails.
 */
export async function embedQuery(text: string, models?: readonly string[]): Promise<number[]> {
  const google = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const query = `task: search result | query: ${text}`;
  return embedWithRouter(google, query, models ?? EMBEDDING_ROUTER_MODELS);
}

/**
 * Gemini Embedding - Documents (Asymmetric)
 * Uses the 'title: none | text: {content}' format for documents as recommended.
 * Supports batching and cascades through EMBEDDING_ROUTER_MODELS if any model fails.
 */
export async function embedDocuments(
  texts: string[],
  models?: readonly string[]
): Promise<number[][]> {
  const google = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const batchSize = GEMINI_EMBEDDING_BATCH_SIZE;
  const results: number[][] = [];
  const activeChain = models ?? EMBEDDING_ROUTER_MODELS;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const batchPromises = batch.map((text) => {
      const doc = `title: none | text: ${text}`;
      return embedWithRouter(google, doc, activeChain);
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // If more batches remain, pause briefly to respect upstream quotas
    if (i + batchSize < texts.length) {
      await sleep(500);
    }
  }

  return results;
}

/**
 * Functional embeddings implementation for LangChain vector stores.
 */
export const vectorEmbeddings: EmbeddingsInterface = {
  embedQuery: (text: string) => embedQuery(text),
  embedDocuments: (texts: string[]) => embedDocuments(texts),
};
