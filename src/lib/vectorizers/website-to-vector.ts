import { tavily } from '@tavily/core';
import { TAVILY_API_KEY } from '@/lib/env';
import type { Document } from '@langchain/core/documents';

function extractTitle(markdown: string, url: string): string {
  // Check for the first markdown heading (# Heading)
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  if (h1Match && h1Match[1].trim()) {
    return h1Match[1].trim();
  }

  // Fallback to URL path segment or hostname
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/+$/, '');
    if (pathname && pathname !== '/') {
      const segment = pathname.split('/').pop();
      if (segment) {
        return decodeURIComponent(segment.replace(/[-_]/g, ' '));
      }
    }
    return parsed.hostname;
  } catch {
    return url;
  }
}

export async function websiteToVector(url: string): Promise<Document[]> {
  try {
    if (!TAVILY_API_KEY) {
      throw new Error('TAVILY_API_KEY is not configured');
    }

    const client = tavily({
      apiKey: TAVILY_API_KEY,
    });

    const response = await client.extract([url], {
      format: 'markdown',
      includeFavicon: true,
    });

    if (
      response.failedResults &&
      response.failedResults.length > 0 &&
      (!response.results || response.results.length === 0)
    ) {
      throw new Error(response.failedResults[0].error || 'Tavily failed to extract URL');
    }

    const item = response.results?.[0];
    if (!item || !item.rawContent) {
      return [];
    }

    const title = extractTitle(item.rawContent, url);

    return [
      {
        pageContent: item.rawContent,
        metadata: {
          title,
          source: url,
          favicon: item.favicon || '',
          images: item.images || [],
        },
      },
    ];
  } catch (error) {
    throw new Error(`Failed to convert Website to vector: ${error}`);
  }
}
