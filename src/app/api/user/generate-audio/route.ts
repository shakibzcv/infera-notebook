import { NextResponse } from 'next/server';
import { generateAudio, aiConfig } from '@/lib/llm';
import { getCurrentUser } from '@/lib/user';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, voice = 'luna' } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Capture the audio buffer generated from Aura-2
    const result = await generateAudio({ text, voice }, aiConfig);

    if (!result.success || !result.buffer) {
      throw new Error(result.error || 'TTS failed');
    }

    // Return the audio as a base64 encoded URL for the client to play
    // Or we could return a direct Blob if we wanted, but base64 is often
    // easier for simple React audio refs without managing blobs.
    const base64Audio = result.buffer.toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error('[GENERATE_AUDIO_ROUTE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}
