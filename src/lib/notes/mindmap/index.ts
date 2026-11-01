import { generateObject, googleConfig } from '@/lib/llm';
import { RetryAfterError } from 'inngest';
import type { InngestStep, NoteHandlerResult } from '../types';
import { PROMPT, OUTPUT_SCHEMA } from './prompt';

export async function generateMindmap(
  step: InngestStep,
  document: string,
  notebookId: string
): Promise<NoteHandlerResult | false> {
  const mindmap = await step.run('generate-mindmap', async () => {
    return await generateObject(
      {
        messages: [{ role: 'user', content: PROMPT(document) }],
        objectName: 'mindmap_generation',
        outputSchema: OUTPUT_SCHEMA,
        notebookId,
      },
      googleConfig
    );
  });

  if (!mindmap) {
    throw new RetryAfterError('Failed to generate Mindmap', 10000);
  }

  return mindmap;
}
