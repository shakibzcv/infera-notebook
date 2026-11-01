import { initializeVectorStore } from '@/lib/pinecone';
import { ToolContext, InferaTool } from '@/types/ai';
import { z } from 'zod';

/**
 * Tools Registry
 * This file centralizes all tool definitions used by the AI agent.
 */

/**
 * Creates tools for the AI agent context using Zod schemas with descriptive fields.
 */
export function createTools(context: ToolContext): Record<string, InferaTool> {
  const searchInVectorStore: InferaTool = {
    name: 'searchInVectorStore',
    description:
      'Search the notebook vector store for relevant excerpts, documents, and notes to answer user questions with verified context. Always call this tool when answering questions about user materials, explaining documents, or retrieving facts.',
    schema: z.object({
      query: z
        .string()
        .describe(
          'The semantic search query string. For broad questions (e.g. "explain the doc", "overview"), use descriptive keywords representing the core topic, introduction, or main concepts. For follow-up questions (e.g. "explain them", "tell me more"), resolve pronouns using conversation history into a standalone topic query rather than literal conversational phrases.'
        ),
    }),
    execute: async ({ query }) => {
      const vs = await initializeVectorStore();
      const filter: any = { userId: context.userId, notebookId: context.notebookId };
      if (context.sourceIds?.length) filter.sourceId = { $in: context.sourceIds };
      const results = await vs!.similaritySearch(query, 25, filter);
      return {
        success: true,
        results: results.map((d) => ({
          content: d.pageContent,
          metadata: d.metadata,
        })),
      };
    },
  };

  // Add more tools here to the registry as needed
  return {
    [searchInVectorStore.name]: searchInVectorStore,
  };
}
