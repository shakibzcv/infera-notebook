import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import {
  EMBEDDING_MODEL_ID,
  GEMINI_EMBEDDING_BATCH_SIZE,
  GEMINI_EMBEDDING_DIMENSIONALITY,
} from '@/lib/constants';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from './config';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Safely extracts the recommended retry delay (in ms) from Google Gemini rate limit errors.
 */
function extractRetryDelayMs(errorData: any, defaultMs = 30000): number {
  try {
    // 1. Inspect details array for RetryInfo
    if (Array.isArray(errorData?.details)) {
      for (const item of errorData.details) {
        if (item?.retryDelay && typeof item.retryDelay === 'string') {
          const match = item.retryDelay.match(/([0-9.]+)\s*s/i);
          if (match) {
            return Math.ceil(parseFloat(match[1]) * 1000) + 1500;
          }
        }
      }
    }

    // 2. Inspect error message for "Please retry in X.XXs"
    const message = errorData?.message || errorData?.error?.message || '';
    const match = message.match(/retry in\s+([0-9.]+)\s*s/i);
    if (match) {
      return Math.ceil(parseFloat(match[1]) * 1000) + 1500;
    }
  } catch {
    // Fall back to default
  }
  return defaultMs;
}

/**
 * Checks whether an error is a 429 / Quota / Rate limit error.
 */
function isRateLimit(status: number, message: string): boolean {
  const lowerMsg = message.toLowerCase();
  return (
    status === 429 ||
    lowerMsg.includes('429') ||
    lowerMsg.includes('resource_exhausted') ||
    lowerMsg.includes('quota exceeded') ||
    lowerMsg.includes('rate limit')
  );
}

/**
 * Calls Gemini's batchEmbedContents endpoint directly with automatic 429 backoff & retry.
 * Using batchEmbedContents sends multiple chunks in ONE single HTTP request,
 * reducing RPM consumption by up to 95%.
 */
async function embedBatchWithRetry(
  texts: string[],
  model: string = EMBEDDING_MODEL_ID,
  maxRetries = 5
): Promise<number[][]> {
  const modelName = model.startsWith('models/') ? model : `models/${model}`;
  const apiKey = GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY for embedding generation.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelName}:batchEmbedContents?key=${encodeURIComponent(apiKey)}`;

  const formattedRequests = texts.map((text) => ({
    model: modelName,
    content: {
      parts: [{ text: `title: none | text: ${text}` }],
    },
    outputDimensionality: GEMINI_EMBEDDING_DIMENSIONALITY,
  }));

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: formattedRequests }),
      });

      if (response.ok) {
        const data = await response.json();
        const embeddings = data.embeddings;
        if (!embeddings || !Array.isArray(embeddings)) {
          throw new Error('Gemini batchEmbedContents returned empty embeddings array.');
        }

        return embeddings.map((item: any, idx: number) => {
          if (!item?.values || item.values.length === 0) {
            throw new Error(`Embedding at index ${idx} returned empty vector.`);
          }
          return item.values;
        });
      }

      // Read error details
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = errorBody?.error?.message || response.statusText || 'Unknown error';

      if (isRateLimit(response.status, errorMessage)) {
        if (attempt < maxRetries) {
          const delayMs = extractRetryDelayMs(
            errorBody,
            Math.min(15000 * Math.pow(1.5, attempt), 60000)
          );
          console.warn(
            `[Gemini Embeddings] Rate limit (429) hit on batch (${texts.length} items). Sleeping for ${Math.round(
              delayMs / 1000
            )}s before retry ${attempt + 1}/${maxRetries}...`
          );
          await sleep(delayMs);
          continue;
        }
      }

      throw new Error(
        `Gemini batchEmbedContents failed with status ${response.status}: ${errorMessage}`
      );
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      if (isRateLimit(err?.status || 0, message) && attempt < maxRetries) {
        const delayMs = extractRetryDelayMs(err, 30000);
        console.warn(
          `[Gemini Embeddings] Rate limit (429) caught. Sleeping for ${Math.round(
            delayMs / 1000
          )}s before retry ${attempt + 1}/${maxRetries}...`
        );
        await sleep(delayMs);
        continue;
      }

      if (attempt === maxRetries) {
        throw err;
      }
    }
  }

  throw new Error(`Failed to generate embeddings after ${maxRetries} retries.`);
}

/**
 * Executes a single embedding call (e.g. for search query) with automatic 429 retry.
 */
async function embedSingleWithRetry(
  content: string,
  model: string = EMBEDDING_MODEL_ID,
  maxRetries = 5
): Promise<number[]> {
  const google = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
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
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      const isQuota = isRateLimit(err?.status || err?.code || 0, message);

      if (isQuota && attempt < maxRetries) {
        const delayMs = extractRetryDelayMs(err, 30000);
        console.warn(
          `[Gemini Embeddings] Rate limit (429) on single embedding. Sleeping for ${Math.round(
            delayMs / 1000
          )}s before retry ${attempt + 1}/${maxRetries}...`
        );
        await sleep(delayMs);
        continue;
      }

      if (attempt === maxRetries) {
        throw err;
      }
    }
  }

  throw new Error(`Failed to generate single embedding after ${maxRetries} retries.`);
}

/**
 * Gemini Embedding - Query (Asymmetric)
 * Uses the 'task: search result | query: ...' format for Gemini embeddings.
 */
export async function embedQuery(
  text: string,
  model: string = EMBEDDING_MODEL_ID
): Promise<number[]> {
  const query = `task: search result | query: ${text}`;
  return embedSingleWithRetry(query, model);
}

/**
 * Gemini Embedding - Documents (Asymmetric)
 * Uses native batchEmbedContents to send batches of up to GEMINI_EMBEDDING_BATCH_SIZE (20)
 * in a SINGLE request, reducing RPM usage by ~95% and staying well below Free Tier limits.
 */
export async function embedDocuments(
  texts: string[],
  model: string = EMBEDDING_MODEL_ID
): Promise<number[][]> {
  const batchSize = GEMINI_EMBEDDING_BATCH_SIZE;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    // Send the entire sub-batch in ONE single HTTP request
    const batchResults = await embedBatchWithRetry(batch, model);
    results.push(...batchResults);

    // If more batches remain, pause briefly (1.5s) to stay far below the 100 RPM quota
    if (i + batchSize < texts.length) {
      await sleep(1500);
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
