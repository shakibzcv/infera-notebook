import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from './config';
import { DEFAULT_TTS_MODEL } from './models';

export interface TTSOptions {
  text?: string;
  voice?: string;
  model?: string;
  multiSpeaker?: {
    speakers: { name: string; voice: string }[];
    turns?: { speaker: string; text: string }[];
  };
}

export interface TTSResult {
  success: boolean;
  buffer?: Buffer;
  error?: string;
  modelUsed?: string;
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
 * Parses script dialogue text into structured turns for multi-speaker synthesis.
 */
function parseTextToTurns(
  text: string,
  speakers: { name: string; voice: string }[]
): { speaker: string; text: string }[] {
  const speakerNames = speakers.map((s) => s.name);
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const turns: { speaker: string; text: string }[] = [];
  let currentSpeaker = speakerNames[0] || 'Speaker 1';
  let currentText = '';

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const potentialName = match[1].trim();
      const matchedSpeaker = speakerNames.find(
        (name) => name.toLowerCase() === potentialName.toLowerCase()
      );
      if (matchedSpeaker) {
        if (currentText) {
          turns.push({ speaker: currentSpeaker, text: currentText });
          currentText = '';
        }
        currentSpeaker = matchedSpeaker;
        currentText = match[2].trim();
        continue;
      }
    }
    currentText = currentText ? `${currentText} ${line}` : line;
  }

  if (currentText) {
    turns.push({ speaker: currentSpeaker, text: currentText });
  }

  if (turns.length === 0 && text.trim()) {
    turns.push({ speaker: currentSpeaker, text: text.trim() });
  }

  return turns;
}

/**
 * Gemini Text-to-Speech (TTS) Generation using direct model execution.
 */
export async function generateTTS(options: TTSOptions): Promise<TTSResult> {
  const { text = '', voice = 'Zephyr', model = DEFAULT_TTS_MODEL, multiSpeaker } = options;
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const isMulti = Boolean(
    multiSpeaker && multiSpeaker.speakers && multiSpeaker.speakers.length > 0
  );

  let parts: any[] = [];
  const config: any = {
    responseModalities: ['AUDIO'],
  };

  if (isMulti && multiSpeaker) {
    const speakers = multiSpeaker.speakers;
    const speakerNames = new Set(speakers.map((s) => s.name));

    // Resolve turns (either provided directly or parsed from text)
    let turns = multiSpeaker.turns;
    if (!turns || turns.length === 0) {
      turns = parseTextToTurns(text, speakers);
    }

    // Ensure every turn specifies speech_metadata.speaker matching a configured speaker
    parts = turns
      .filter((t) => t.text && t.text.trim().length > 0)
      .map((t) => {
        const validSpeaker = speakerNames.has(t.speaker) ? t.speaker : speakers[0].name;
        return {
          text: t.text.trim(),
          speech_metadata: { speaker: validSpeaker },
        };
      });

    // In case no turns were found, provide fallback part
    if (parts.length === 0) {
      parts = [
        {
          text: text.trim() || 'Hello',
          speech_metadata: { speaker: speakers[0].name },
        },
      ];
    }

    config.speechConfig = {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: speakers.map((s) => ({
          speaker: s.name,
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: s.voice },
          },
        })),
      },
    };
  } else {
    parts = [{ text: text.trim() }];
    config.speechConfig = {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: voice },
      },
    };
  }

  try {
    console.log(`[TTS] Generating audio with model: "${model}" (multiSpeaker: ${isMulti})`);

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts }],
      config,
    });

    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!data) {
      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        throw new Error('TTS generation blocked by safety filters.');
      }
      throw new Error(`No audio data returned from model "${model}".`);
    }

    const pcmBuffer = Buffer.from(data, 'base64');
    const wavBuffer = addWavHeader(pcmBuffer);

    console.log(`[TTS] Successfully generated audio using model: "${model}"`);
    return { success: true, buffer: wavBuffer, modelUsed: model };
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error(`[TTS] Generation failed using model "${model}":`, errorMsg);
    return {
      success: false,
      error: errorMsg,
      modelUsed: model,
    };
  }
}
