import { generateObject, generateCaptions, googleConfig, aiConfig } from '@/lib/llm';
import { generateTTS } from '@/lib/llm/generate-tts';
import { uploadAsset, getSignedDownloadUrl } from '@/lib/s3';
import { getWaveformPeaks } from '@/lib/audio/waveform';
import { geminiVoices } from '@/lib/characters';
import { RetryAfterError } from 'inngest';
import type { InngestStep, NoteHandlerResult } from '../types';
import { PROMPT, OUTPUT_SCHEMA } from './prompt';

export async function generateAudioOverview(
  step: InngestStep,
  document: string,
  notebookId: string
): Promise<NoteHandlerResult | false> {
  const script = await step.run('generate-podcast-script', async () => {
    // Randomly select 2 voices to use as a hint for the LLM
    const shuffled = [...geminiVoices].sort(() => 0.5 - Math.random());
    const selectedVoices = shuffled.slice(0, 2);
    const voicesHint = selectedVoices.map((v) => `${v.name} (${v.model})`).join(', ');

    return await generateObject<{
      title: string;
      participants: any[];
      segments: any[];
    }>(
      {
        messages: [
          {
            role: 'user',
            content:
              PROMPT(document) + `\n\nFor this episode, please use these two voices: ${voicesHint}`,
          },
        ],
        objectName: 'podcast_script',
        outputSchema: OUTPUT_SCHEMA,
        notebookId,
      },
      googleConfig
    );
  });

  if (!script || !script.title || !script.segments) {
    throw new RetryAfterError('Failed to generate Podcast script', 10000);
  }

  const audioFile = await step.run('generate-audio-file', async () => {
    return await _generateAudio(script.segments, script.participants);
  });

  if (!audioFile || !audioFile.path) {
    throw new RetryAfterError('Failed to generate Audio file', 10000);
  }

  const transcript = await step.run('generate-transcript', async () => {
    const signedUrl = await getSignedDownloadUrl(audioFile.path);
    return await generateCaptions(signedUrl, aiConfig);
  });

  return {
    title: script.title,
    content: {
      path: audioFile.path,
      waveform: audioFile.waveform,
      transcript: transcript,
      participants: script.participants || [],
      segments: script.segments,
    },
  };
}

async function _generateAudio(segments: any[], participants: any[]) {
  const turns = segments.map((s) => {
    const participant = participants.find((p) => p.voice === s.voice);
    const name = participant ? participant.name : participants[0]?.name || 'Speaker';
    return {
      speaker: name,
      text: s.content,
    };
  });

  const result = await generateTTS({
    multiSpeaker: {
      speakers: participants.map((p) => ({
        name: p.name,
        voice: p.voice,
      })),
      turns,
    },
  });

  if (!result.success || !result.buffer) {
    throw new Error(`Failed to generate multi-speaker audio: ${result.error || 'Unknown error'}`);
  }

  // Generate waveform peaks from the PCM data (skipping 44 bytes of WAV header)
  const pcmBuffer = result.buffer.subarray(44);
  const waveform = getWaveformPeaks(pcmBuffer, 100);

  const upload = await uploadAsset({
    buffer: result.buffer,
    folder: 'audio',
    extension: 'wav',
    contentType: 'audio/wav',
  });

  return {
    ...upload,
    waveform,
  };
}
