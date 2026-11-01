import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '@/lib/env';
import { getUser } from '@/lib/user';

import { LIVE_ROUTER_MODELS } from '@/lib/llm/model-router';

/**
 * GET Handler - Provides a short-lived token for the Gemini Live API
 * along with the prioritized list of Live API fallback models.
 */
export async function GET() {
  try {
    // Authenticate the user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
    }

    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    // Generate an ephemeral token valid for 30 minutes
    const now = new Date();
    const expireTime = new Date(now.getTime() + 30 * 60000);
    const newSessionExpireTime = new Date(now.getTime() + 60000);

    const token = await client.authTokens.create({
      config: {
        expireTime: expireTime.toISOString(),
        newSessionExpireTime: newSessionExpireTime.toISOString(),
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    return NextResponse.json({
      token: token.name,
      expiresAt: expireTime.toISOString(),
      models: LIVE_ROUTER_MODELS,
    });
  } catch (error) {
    console.error('[API_LIVE_TOKEN_ERROR]', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to generate live transcription token',
      },
      { status: 500 }
    );
  }
}
