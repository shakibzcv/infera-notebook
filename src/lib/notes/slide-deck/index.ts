import { generateObject, generateImage, googleConfig, aiConfig } from '@/lib/llm';
import { RetryAfterError } from 'inngest';
import type { InngestStep, NoteHandlerResult } from '../types';
import { PROMPT, OUTPUT_SCHEMA } from './prompt';

export async function generateSlideDeck(
  step: InngestStep,
  document: string,
  notebookId: string
): Promise<NoteHandlerResult | false> {
  const structure = await step.run('generate-slide-deck-structure', async () => {
    return await generateObject<{ title: string; slides: any[] }>(
      {
        messages: [{ role: 'user', content: PROMPT(document) }],
        objectName: 'slide_deck_structure',
        outputSchema: OUTPUT_SCHEMA,
        notebookId,
      },
      googleConfig
    );
  });

  if (!structure || !structure.slides || structure.slides.length === 0) {
    throw new RetryAfterError('Failed to generate Slide Deck structure', 10000);
  }

  const slidesWithImages = await step.run('generate-slide-deck-images', async () => {
    const results = await Promise.all(
      structure.slides.map(async (s: any) => {
        const result = await generateImage(
          {
            prompt: s.imageCreationPrompt,
            width: 1024,
            height: 1024,
          },
          aiConfig
        );
        if (result.success && result.path) {
          return { title: s.title, path: result.path };
        }
        return null;
      })
    );
    return results.filter((s) => s !== null);
  });

  if (!slidesWithImages || slidesWithImages.length === 0) {
    throw new RetryAfterError('Failed to generate Slide Deck images', 10000);
  }

  return {
    title: structure.title,
    content: slidesWithImages,
  };
}
