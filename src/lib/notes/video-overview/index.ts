import { generateObject, generateImage, generateCaptions, googleConfig, aiConfig } from '@/lib/llm';
import { generateTTS } from '@/lib/llm/generate-tts';
import { uploadAsset, getSignedDownloadUrl } from '@/lib/s3';
import { RetryAfterError } from 'inngest';
import type { InngestStep, NoteHandlerResult } from '../types';
import { SCRIPT_PROMPT, SCRIPT_SCHEMA, IMAGES_PROMPT, IMAGES_SCHEMA } from './prompt';

export async function generateVideoOverview(
  step: InngestStep,
  document: string,
  notebookId: string
): Promise<NoteHandlerResult | false> {
  const script = await step.run('generate-video-script', async () => {
    return await generateObject<{
      title: string;
      participants: { name: string; voice: string }[];
      videoScript: string;
      keyterms: string[];
    }>(
      {
        messages: [{ role: 'user', content: SCRIPT_PROMPT(document) }],
        objectName: 'video_script_generation',
        outputSchema: SCRIPT_SCHEMA,
        notebookId,
      },
      googleConfig
    );
  });

  if (!script || !script.videoScript || !script.participants || !script.keyterms) {
    throw new RetryAfterError('Failed to generate Video script', 10000);
  }

  const audioFile = await step.run('generate-audio-file', async () => {
    return await _generateAudio(script);
  });

  if (!audioFile || !audioFile.path) {
    throw new RetryAfterError('Failed to generate Audio file', 10000);
  }

  const captions = await step.run('generate-captions', async () => {
    const signedAudioUrl = await getSignedDownloadUrl(audioFile.path);
    return await generateCaptions(signedAudioUrl, aiConfig, script.keyterms);
  });

  if (!Array.isArray(captions)) {
    throw new RetryAfterError('Failed to generate Captions', 10000);
  }

  const imagePrompts = await step.run('generate-image-prompts', async () => {
    return await generateObject<{ imagePrompt: string; sceneContent: string }[]>(
      {
        messages: [{ role: 'user', content: IMAGES_PROMPT(script.videoScript) }],
        objectName: 'video_image_prompts',
        outputSchema: IMAGES_SCHEMA,
        notebookId,
      },
      googleConfig
    );
  });

  if (!imagePrompts || !Array.isArray(imagePrompts) || imagePrompts.length === 0) {
    throw new RetryAfterError('Failed to generate Image prompts', 10000);
  }

  const images = await step.run('generate-images', async () => {
    return await _generateImages(imagePrompts);
  });

  if (!images || !Array.isArray(images) || images.length === 0) {
    throw new RetryAfterError('Failed to generate Images', 10000);
  }

  return {
    title: script.title,
    content: {
      path: audioFile.path,
      captions: captions,
      images: images,
      videoScript: script.videoScript,
    },
  };
}

async function _generateAudio(script: {
  videoScript: string;
  participants: { name: string; voice: string }[];
}) {
  const isMultiSpeaker = script.participants.length > 1;

  let promptText = script.videoScript;
  if (isMultiSpeaker) {
    const names = script.participants.map((p) => p.name).join(' and ');
    promptText = `TTS the following conversation between ${names}:\n\n${script.videoScript}`;
  }

  const result = await generateTTS({
    text: promptText,
    voice: !isMultiSpeaker ? script.participants[0].voice : undefined,
    multiSpeaker: isMultiSpeaker
      ? {
          speakers: script.participants.map((p) => ({
            name: p.name,
            voice: p.voice,
          })),
        }
      : undefined,
  });

  if (!result.success || !result.buffer) return null;

  return await uploadAsset({
    buffer: result.buffer,
    folder: 'audio',
    extension: 'wav',
    contentType: 'audio/wav',
  });
}

async function _generateImages(imageScripts: { imagePrompt: string; sceneContent: string }[]) {
  const results = [];
  for (const script of imageScripts) {
    const result = await generateImage(
      {
        prompt: script.imagePrompt,
        width: 1920,
        height: 1080,
      },
      aiConfig
    );
    if (result.success && result.path) {
      results.push({
        path: result.path,
        sceneContent: script.sceneContent,
      });
    }
  }
  return results;
}
