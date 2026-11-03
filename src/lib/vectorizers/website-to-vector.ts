import Firecrawl from '@mendable/firecrawl-js';
import { FIRECRAWL_API_KEY } from '@/lib/env';
import type { Document } from '@langchain/core/documents';

export async function websiteToVector(url: string): Promise<Document[]> {
  try {
    const firecrawl = new Firecrawl({
      apiKey: FIRECRAWL_API_KEY,
    });

    // Use scrapeUrl (v0/v1) as per our successful test
    const result = await (firecrawl as any).scrapeUrl(url, {
      formats: ['markdown'],
    });

    if (!result.success) {
      throw new Error(result.error || 'Firecrawl failed to scrape the URL');
    }

    const data = result.data;

    if (!data || !data.markdown) {
      return [];
    }

    return [
      {
        pageContent: data.markdown,
        metadata: {
          title: data.metadata?.title || '',
          description: data.metadata?.description || '',
          source: url,
          ...data.metadata,
        },
      },
    ];
  } catch (error) {
    throw new Error(`Failed to convert Website to vector: ${error}`);
  }
}
