import { generateObject, googleConfig } from '@/lib/llm';
import { RetryAfterError } from 'inngest';
import type { InngestStep, NoteHandlerResult } from '../types';
import { PROMPT, OUTPUT_SCHEMA } from './prompt';

export async function generateBriefing(
  step: InngestStep,
  document: string,
  notebookId: string
): Promise<NoteHandlerResult | false> {
  const briefing = await step.run('generate-briefing-doc', async () => {
    return await generateObject(
      {
        messages: [{ role: 'user', content: PROMPT(document) }],
        objectName: 'briefing_document',
        outputSchema: OUTPUT_SCHEMA,
        notebookId,
      },
      googleConfig
    );
  });

  if (!briefing) {
    throw new RetryAfterError('Failed to generate Briefing Doc', 10000);
  }

  return briefing;
}
