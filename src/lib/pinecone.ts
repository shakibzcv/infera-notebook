/**
 * Pinecone Documents API Client (2026-07)
 *
 * Uses Pinecone's native Documents API with integrated NVIDIA llama-text-embed-v2
 * embeddings. Pinecone automatically embeds `chunk_text` on upsert and search —
 * no external embedding calls needed for writes or search.
 */
import * as env from '@/lib/env';

const PINECONE_API_VERSION = '2026-07';

function getIndexHost(): string {
  const host = env.PINECONE_HOST;
  if (!host) {
    throw new Error('PINECONE_HOST is not configured. Add it to your .env file.');
  }
  return host.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function normalizeNamespace(namespace?: string): string {
  if (!namespace || namespace.trim() === '') {
    return 'default';
  }
  return namespace.trim();
}

function getHeaders() {
  return {
    'Api-Key': env.PINECONE_API_KEY!,
    'Content-Type': 'application/json',
    'X-Pinecone-API-Version': PINECONE_API_VERSION,
  };
}

/**
 * Upserts document chunks into Pinecone using the Documents API.
 * Pinecone auto-embeds the `chunk_text` field using the integrated model.
 */
export async function upsertDocuments(
  namespace: string,
  documents: Array<{
    _id: string;
    chunk_text: string;
    title: string;
    sourceId: string;
    notebookId: string;
    userId: string;
    chunkIndex?: number;
    fileType?: string;
    timestamp?: string;
  }>
): Promise<void> {
  const host = getIndexHost();
  const ns = normalizeNamespace(namespace);
  const url = `https://${host}/namespaces/${encodeURIComponent(ns)}/documents/upsert`;

  // Pinecone Documents API accepts up to 96 documents per request
  const BATCH_SIZE = 96;
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ documents: batch }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Pinecone upsert failed (${response.status}): ${error?.error?.message || response.statusText}`
      );
    }
  }
}

/**
 * Searches Pinecone using semantic (dense embed) search.
 * Pinecone auto-embeds the query text using the integrated model.
 */
export async function searchDocuments(
  namespace: string,
  query: string,
  topK: number,
  filter?: Record<string, any>
): Promise<
  Array<{
    _id: string;
    _score: number;
    chunk_text: string;
    title?: string;
    sourceId?: string;
    notebookId?: string;
    userId?: string;
    chunkIndex?: number;
    fileType?: string;
  }>
> {
  const host = getIndexHost();
  const ns = normalizeNamespace(namespace);
  const url = `https://${host}/namespaces/${encodeURIComponent(ns)}/documents/search`;

  const body: Record<string, any> = {
    top_k: topK,
    score_by: [{ type: 'embed', field: 'chunk_text', query }],
    include_fields: ['chunk_text', 'title', 'sourceId', 'notebookId', 'userId', 'chunkIndex', 'fileType'],
  };

  if (filter) {
    body.filter = filter;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Pinecone search failed (${response.status}): ${error?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.matches ?? [];
}

/**
 * Deletes documents from Pinecone by filter (e.g. { sourceId: { $eq: 'xyz' } }).
 */
export async function deleteDocumentsByFilter(
  namespace: string,
  filter: Record<string, any>
): Promise<void> {
  const host = getIndexHost();
  const ns = normalizeNamespace(namespace);
  const url = `https://${host}/namespaces/${encodeURIComponent(ns)}/documents/delete`;

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ filter }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Pinecone delete failed (${response.status}): ${error?.error?.message || response.statusText}`
    );
  }
}

/**
 * Deletes specific documents from Pinecone by their IDs.
 */
export async function deleteDocumentsByIds(namespace: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const host = getIndexHost();
  const ns = normalizeNamespace(namespace);
  const url = `https://${host}/namespaces/${encodeURIComponent(ns)}/documents/delete`;

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Pinecone delete by IDs failed (${response.status}): ${error?.error?.message || response.statusText}`
    );
  }
}

/**
 * Deletes all documents in a namespace.
 */
export async function deleteAllDocuments(namespace: string): Promise<void> {
  const host = getIndexHost();
  const ns = normalizeNamespace(namespace);
  const url = `https://${host}/namespaces/${encodeURIComponent(ns)}/documents/delete`;

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ delete_all: true }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Pinecone deleteAll failed (${response.status}): ${error?.error?.message || response.statusText}`
    );
  }
}
