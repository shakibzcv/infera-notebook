import { generateObject, googleConfig } from '@/lib/llm';
import { RetryAfterError } from 'inngest';
import type { InngestStep, NoteHandlerResult } from '../types';
import { PROMPT, OUTPUT_SCHEMA } from './prompt';

export async function generateFaq(
  step: InngestStep,
  document: string,
  notebookId: string
): Promise<NoteHandlerResult | false> {
  const faq = await step.run('generate-faq', async () => {
    return await generateObject(
      {
        messages: [{ role: 'user', content: PROMPT(document) }],
        objectName: 'faq_generation',
        outputSchema: OUTPUT_SCHEMA,
        notebookId,
      },
      googleConfig
    );
  });

  if (!faq) {
    throw new RetryAfterError('Failed to generate FAQ', 10000);
  }

  return faq;
}
