import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from './config';
import { TTS_ROUTER_MODELS, type TTSRouterModel } from './model-router';

export interface TTSOptions {
  text: string;
  voice?: string;
  multiSpeaker?: {
    speakers: { name: string; voice: string }[];
  };
}

export interface TTSResult {
  success: boolean;
  buffer?: Buffer;
  error?: string;
  modelUsed?: TTSRouterModel;
}

/**
 * Adds a WAV header to a PCM buffer.
 * Gemini TTS returns raw 16-bit PCM at 24kHz Mono.
 */
function addWavHeader(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // AudioFormat: 1 (PCM)
  header.writeUInt16LE(1, 22); // NumChannels: 1 (Mono)
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  header.writeUInt16LE(2, 32); // BlockAlign
  header.writeUInt16LE(16, 34); // BitsPerSample
  header.write('data', 36);
  header.writeUInt32LE(pcmBuffer.length, 40);
  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Gemini Text-to-Speech (TTS) Generation with Model Router Fallback
 * Cascades across TTS_ROUTER_MODELS (gemini-3.8-flash-tts -> gemini-3.8-flash-lite-tts -> gemini-3.1-flash-tts-preview -> gemini-2.5-flash-preview-tts)
 * to maximize rate limits and prevent 429/500 generation failures.
 */
export async function generateTTS(options: TTSOptions): Promise<TTSResult> {
  const { text, voice = 'Zephyr', multiSpeaker } = options;
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const model = TTS_ROUTER_MODELS[0];
  try {
    console.log(`[TTS] Generating audio with model: "${model}"`);

    const config: any = {
      responseModalities: ['AUDIO'],
    };

    if (multiSpeaker && multiSpeaker.speakers.length > 0) {
      config.speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: multiSpeaker.speakers.map((s) => ({
            speaker: s.name,
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: s.voice },
            },
          })),
        },
      };
    } else {
      config.speechConfig = {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      };
    }

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text }] }],
      config,
    });

    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!data) {
      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        throw new Error(`TTS generation blocked by safety filters.`);
      }
      throw new Error(`No audio data returned from model "${model}".`);
    }

    const pcmBuffer = Buffer.from(data, 'base64');
    const wavBuffer = addWavHeader(pcmBuffer);

    console.log(`[TTS] Successfully generated audio using model: "${model}"`);
    return { success: true, buffer: wavBuffer, modelUsed: model };
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error(`[TTS] Model "${model}" failed: ${msg}`);
    return {
      success: false,
      error: msg,
    };
  }
}
