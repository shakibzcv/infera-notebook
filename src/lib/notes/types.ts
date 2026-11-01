import { inngest } from '@/inngest/client';

/**
 * Common types for Note Services.
 */

export type InngestStep = Parameters<Parameters<typeof inngest.createFunction>[2]>[0]['step'];

export interface NoteHandlerResult {
  title: string;
  content: any;
}

export type NoteHandler = (
  step: InngestStep,
  document: string,
  notebookId: string
) => Promise<NoteHandlerResult | false>;
