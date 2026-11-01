import { generateObject, googleConfig } from '@/lib/llm';
import { RetryAfterError } from 'inngest';
import type { InngestStep, NoteHandlerResult } from '../types';
import { PROMPT, OUTPUT_SCHEMA } from './prompt';

export async function generateFlashCards(
  step: InngestStep,
  document: string,
  notebookId: string
): Promise<NoteHandlerResult | false> {
  const flashCards = await step.run('generate-flash-cards', async () => {
    return await generateObject(
      {
        messages: [{ role: 'user', content: PROMPT(document) }],
        objectName: 'flash_cards_generation',
        outputSchema: OUTPUT_SCHEMA,
        notebookId,
      },
      googleConfig
    );
  });

  if (!flashCards) {
    throw new RetryAfterError('Failed to generate Flash Cards', 10000);
  }

  return flashCards;
}
