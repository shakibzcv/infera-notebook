import { GoogleGenAI } from '@google/genai';
import { DEFAULT_MODEL } from './model-router';
import { GenerateObjectOptions } from '@/types/ai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

/**
 * Structured JSON Generation using single model (Gemini 3.5 Flash Lite).
 * Multi-model routing and fallback chains have been removed.
 */
export async function generateObject<T>(
  options: GenerateObjectOptions,
  config: { apiKey: string }
): Promise<T> {
  const { messages, outputSchema, temperature } = options;
  const { apiKey } = config;
  const model = options.model || (options.models && options.models[0]) || DEFAULT_MODEL;

  const ai = new GoogleGenAI({ apiKey });

  let jsonSchema: any;
  if (outputSchema instanceof z.ZodType) {
    if (typeof (z as any).toJSONSchema === 'function') {
      const raw = (z as any).toJSONSchema(outputSchema);
      const { $schema, additionalProperties, ...rest } = raw;
      jsonSchema = rest;
    } else {
      jsonSchema = zodToJsonSchema(outputSchema as any) as any;
    }
  } else {
    jsonSchema = outputSchema;
  }

  const systemInstruction = messages.find((m: any) => m.role === 'system')?.content;

  const conversationMessages = messages.filter((m: any) => m.role !== 'system');
  const history = conversationMessages.slice(0, -1).map((m: any) => {
    const parts: any[] = [];
    if (typeof m.content === 'string') {
      parts.push({ text: m.content });
    } else if (Array.isArray(m.content)) {
      parts.push(...m.content);
    }
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts,
    };
  });

  const lastMessage = conversationMessages[conversationMessages.length - 1];
  const lastMessageContent = lastMessage?.content || '';

  console.log(`[Object Generation] Generating structured object with model: "${model}"`);

  const chat = ai.chats.create({
    model,
    history,
    config: {
      systemInstruction,
      temperature: temperature ?? 1.0,
      responseMimeType: 'application/json',
      responseJsonSchema: jsonSchema,
    },
  });

  const response = await chat.sendMessage({
    message: lastMessageContent,
  });

  if (!response.text) {
    throw new Error(`Model "${model}" returned empty response.`);
  }

  const parsed = JSON.parse(response.text) as T;
  console.log(`[Object Generation] Successfully generated structured object using model: "${model}"`);
  return parsed;
}
