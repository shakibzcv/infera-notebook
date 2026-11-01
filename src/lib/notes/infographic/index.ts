import { generateObject, generateImage, googleConfig, aiConfig } from '@/lib/llm';
import { RetryAfterError } from 'inngest';
import type { InngestStep, NoteHandlerResult } from '../types';
import type { InfographicImageNoteType } from '@/types/notes';
import { PROMPT, OUTPUT_SCHEMA } from './prompt';

export async function generateInfographic(
  step: InngestStep,
  document: string,
  notebookId: string
): Promise<NoteHandlerResult | false> {
  const details = await step.run('generate-infographic-details', async () => {
    return await generateObject<{ title: string; imageCreationPrompt: string }>(
      {
        messages: [{ role: 'user', content: PROMPT(document) }],
        objectName: 'infographic_details',
        outputSchema: OUTPUT_SCHEMA,
        notebookId,
      },
      googleConfig
    );
  });

  if (!details) {
    throw new RetryAfterError('Failed to generate Infographic details', 10000);
  }

  const imageDetails = await step.run('generate-infographic-image', async () => {
    return await generateImage(
      {
        prompt: details.imageCreationPrompt,
        width: 500,
        height: 1000,
      },
      aiConfig
    );
  });

  if (!imageDetails || !imageDetails.success || !imageDetails.image) {
    throw new RetryAfterError('Failed to generate Infographic image', 10000);
  }

  const content: Omit<InfographicImageNoteType, 'imageUrl'> = {
    path: imageDetails.path ?? '',
    prompt: imageDetails.prompt,
    width: imageDetails.width ?? 500,
    height: imageDetails.height ?? 1000,
    model: imageDetails.model ?? 'black-forest-labs/flux-schnell',
  };

  return { title: details.title, content: content as any };
}
