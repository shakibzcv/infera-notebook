import { GoogleGenAI } from '@google/genai';
import { DEFAULT_MODEL } from './models';
import { GenerateTextOptions } from '@/types/ai';

/**
 * Text Generation using Gemini.
 */
export async function generateText(
  options: GenerateTextOptions,
  config: { apiKey: string }
): Promise<string> {
  const { messages, temperature } = options;
  const { apiKey } = config;
  const model = options.model || DEFAULT_MODEL;

  const ai = new GoogleGenAI({ apiKey });
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

  console.log(`[Text Generation] Generating text with model: "${model}"`);

  const chatConfig: any = {
    temperature: temperature ?? 1.0,
  };
  if (systemInstruction) {
    chatConfig.systemInstruction = systemInstruction;
  }

  const chat = ai.chats.create({
    model,
    history,
    config: chatConfig,
  });

  const response = await chat.sendMessage({
    message: lastMessageContent,
  });

  if (response.text !== undefined && response.text !== null) {
    console.log(`[Text Generation] Successfully generated text using model: "${model}"`);
    return response.text;
  }

  throw new Error(`Model "${model}" returned empty text response.`);
}
