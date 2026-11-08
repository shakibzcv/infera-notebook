import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

/**
 * Pinecone Database Reset Script
 * Deletes all documents/vectors and namespaces from the configured Pinecone index to return it to a clean slate.
 * Supports both Document Schema indexes (API 2026-07) and legacy Vector indexes.
 */
async function resetPinecone() {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;

  if (!apiKey || !indexName) {
    console.error(
      '\x1b[31m%s\x1b[0m',
      'Error: Missing required environment variables (PINECONE_API_KEY, PINECONE_INDEX).'
    );
    process.exit(1);
  }

  console.log('\n\x1b[36m%s\x1b[0m', '--- Pinecone Vector Database Reset Start ---');
  console.log(`Target Index: ${indexName}`);

  try {
    const pc = new Pinecone({ apiKey });
    const index = pc.Index(indexName);

    // 1. Resolve index host
    let host = process.env.PINECONE_HOST;
    if (!host) {
      console.log('Resolving host from Pinecone control plane...');
      const indexDescription = await pc.describeIndex(indexName);
      host = indexDescription.host;
    }
    const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    console.log(`Index Host: ${cleanHost}`);

    // 2. Inspect current index statistics
    console.log(`Fetching statistics for index "${indexName}"...`);
    const stats = await index.describeIndexStats();
    console.log(`Total Record Count: ${stats.totalRecordCount ?? 0}`);
    console.log(`Index Dimension: ${stats.dimension ?? 'N/A'}`);

    if (stats.namespaces && Object.keys(stats.namespaces).length > 0) {
      console.log(`Found namespaces: ${Object.keys(stats.namespaces).join(', ')}`);
      for (const [ns, nsInfo] of Object.entries(stats.namespaces)) {
        console.log(`Clearing namespace "${ns}" (${nsInfo.recordCount ?? 0} records)...`);

        let cleared = false;

        // Try Documents API (2026-07) first for document-schema indices
        try {
          const docDeleteUrl = `https://${cleanHost}/namespaces/${encodeURIComponent(ns)}/documents/delete`;
          const response = await fetch(docDeleteUrl, {
            method: 'POST',
            headers: {
              'Api-Key': apiKey,
              'Content-Type': 'application/json',
              'X-Pinecone-API-Version': '2026-07',
            },
            body: JSON.stringify({ delete_all: true }),
          });

          if (response.ok || response.status === 202) {
            console.log(`✅ Cleared namespace "${ns}" via Documents API`);
            cleared = true;
          }
        } catch {
          // If Documents API is unsupported, fall through to vector deleteAll
        }

        // Fallback to legacy vectors deleteAll if not cleared via Documents API
        if (!cleared) {
          try {
            await index.namespace(ns).deleteAll();
            console.log(`✅ Cleared namespace "${ns}" via Vectors API`);
          } catch (e: any) {
            if (e?.name === 'PineconeNotFoundError' || e?.status === 404) {
              console.log(`ℹ️ Namespace "${ns}" was already empty.`);
            } else {
              throw e;
            }
          }
        }
      }
    } else {
      console.log('ℹ️ Index is already empty. No namespaces to clear.');
    }

    // 3. Confirm post-reset stats
    const postStats = await index.describeIndexStats();
    console.log(`Post-reset Record Count: ${postStats.totalRecordCount ?? 0}`);

    console.log('\n\x1b[32m%s\x1b[0m', '--- Pinecone Vector Database Reset Complete! ---');
  } catch (error) {
    console.error('\n\x1b[31m%s\x1b[0m', '❌ Error during Pinecone database reset:');
    console.error(error);
    process.exit(1);
  }
}

resetPinecone();
