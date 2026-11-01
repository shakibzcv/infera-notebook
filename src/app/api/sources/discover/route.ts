/**
 * Web Discovery API
 * Leverages Tavily Search to find highly relevant PDF and web sources
 * based on user interest queries.
 */
import { TAVILY_API_KEY } from '@/lib/env';
import { tavily } from '@tavily/core';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const webSearchClient = tavily({
    apiKey: TAVILY_API_KEY,
  });

  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const response = await webSearchClient.search(`${query} filetype:pdf`, {
      includeFavicon: true,
    });

    return NextResponse.json(
      {
        results: response.results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[DISCOVER_SOURCES]', error);
    return NextResponse.json({ error: 'Failed to discover sources' }, { status: 500 });
  }
}
