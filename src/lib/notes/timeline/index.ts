import { generateObject, googleConfig } from '@/lib/llm';
import { RetryAfterError } from 'inngest';
import type { InngestStep, NoteHandlerResult } from '../types';
import { PROMPT, OUTPUT_SCHEMA } from './prompt';

export async function generateTimeline(
  step: InngestStep,
  document: string,
  notebookId: string
): Promise<NoteHandlerResult | false> {
  const timeline = await step.run('generate-timeline', async () => {
    return await generateObject(
      {
        messages: [{ role: 'user', content: PROMPT(document) }],
        objectName: 'timeline_generation',
        outputSchema: OUTPUT_SCHEMA,
        notebookId,
      },
      googleConfig
    );
  });

  if (!timeline) {
    throw new RetryAfterError('Failed to generate Timeline', 10000);
  }

  return timeline;
}
