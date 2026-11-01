import { DeepgramClient } from '@deepgram/sdk';
import { TRANSCRIPTION_MODEL_ID } from '@/lib/constants';

/**
 * Transcription (Deepgram Nova-3) using official SDK v5
 */
export async function generateCaptions(
  audioUrl: string,
  config: { deepgramKey: string },
  keyterms?: string[]
): Promise<any[]> {
  const { deepgramKey } = config;

  if (!deepgramKey) {
    throw new Error('Deepgram API key is missing');
  }

  // Deepgram SDK v5 uses the options object for initialization
  const deepgram = new DeepgramClient({ apiKey: deepgramKey });

  // Deepgram SDK v5 method path for remote URL transcription.
  // We cast the options object to 'any' to resolve the TypeScript error:
  // "Object literal may only specify known properties, and 'model' does not exist in type 'RequestOptions'".
  const response = await deepgram.listen.v1.media.transcribeUrl({ url: audioUrl }, {
    model: TRANSCRIPTION_MODEL_ID, // nova-3
    smart_format: true,
    punctuate: true,
    keyterm: keyterms,
  } as any);

  // Deepgram SDK v5 returns a union type that might be an 'Accepted' response (for callbacks).
  // Since we are using it synchronously, we cast to 'any' to access the 'results' property safely.
  // We also handle both 'response.results' and 'response.result.results' patterns seen in different v5 sub-versions.
  const res = response as any;
  const results = res.results || res.result?.results;

  if (!results) {
    throw new Error('Failed to retrieve transcription results from Deepgram');
  }

  return results.channels[0]?.alternatives[0]?.words || [];
}
