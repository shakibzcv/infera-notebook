import { TTS_MODEL_ID } from '@/lib/constants';
import { GenerateAudioOptions, GenerateAudioResult } from '@/types/ai';

/**
 * Audio Generation (Deepgram Aura)
 */
export async function generateAudio(
  options: GenerateAudioOptions,
  config: { deepgramKey: string }
): Promise<GenerateAudioResult> {
  const { text, voice = 'luna' } = options;
  const { deepgramKey } = config;

  try {
    const response = await fetch(
      `https://api.deepgram.com/v1/speak?model=aura-${voice.toLowerCase()}-en`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${deepgramKey}`,
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepgram TTS error (${response.status}): ${errorText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return { success: true, buffer, text };
  } catch (error) {
    console.error('[GENERATE_AUDIO_ERROR]', error);
    return { success: false, error: String(error), text };
  }
}
