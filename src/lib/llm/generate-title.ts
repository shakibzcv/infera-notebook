import { generateText } from './generate-text';
import { googleConfig } from './config';

/**
 * Generates a concise, descriptive title for a chat note based on its content.
 * Prioritizes high-throughput Gemma 4 models (14.4K RPD / 30 RPM) to conserve main Gemini quotas.
 * @param content - The text content of the chat/note
 * @returns A promise resolving to a short title string
 */
export async function generateNoteTitleFromMessage(content: string): Promise<string> {
  const prompt = `
<role>
You are an expert editorial taxonomist and headline writer.
</role>

<task>
Analyze the following content and generate a concise, high-impact Title (strictly 3 to 5 words) capturing the core substantive subject.
</task>

<rules>
- Strictly 3 to 5 words.
- Use Title Case (capitalize major words).
- Focus strictly on the substantive topic (e.g., "Transformer Multi-Head Attention", "Quarterly Revenue Growth Drivers").
- NEVER use generic placeholders or filler like "Chat Note", "Summary", "Discussion", "Key Takeaways", "Overview", or "Notes".
- Output ONLY the raw title text with NO quotes, brackets, markdown, or trailing punctuation.
</rules>

<content>
${content}
</content>
  `;

  try {
    const result = await generateText(
      {
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates concise titles.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      },
      googleConfig
    );

    return result?.trim() || 'Chat Note';
  } catch (error) {
    console.error('[GENERATE_NOTE_TITLE_ERROR]', error);
    return 'Chat Note';
  }
}

/**
 * Generates an intelligent, high-impact Title (2 to 5 words) for a chat conversation using an AI model.
 * Prioritizes high-throughput Gemma 4 models (14.4K RPD / 30 RPM) to conserve main Gemini quotas.
 * @param message - The user's initial prompt or message text
 * @returns A promise resolving to an AI-crafted title in Title Case
 */
export async function generateChatTitle(message: string): Promise<string> {
  const prompt = `
<role>
You are an expert conversation taxonomist and headline writer.
</role>

<task>
Analyze the user's message and generate a concise, high-impact Chat Title (strictly 2 to 5 words) capturing the substantive topic.
</task>

<rules>
- Strictly 2 to 5 words.
- Use Title Case (e.g. "Quantum Computing Basics", "React State Optimization", "French Revolution Causes").
- NEVER use generic placeholders or filler like "Chat", "New Chat", "Question", "Help", "Discussion", "Prompt", "Notes", or "Untitled".
- Output ONLY the raw title with NO quotes, brackets, markdown, or punctuation.
</rules>

<message>
${message.slice(0, 500)}
</message>
  `;

  try {
    const result = await generateText(
      {
        messages: [
          {
            role: 'system',
            content: 'You generate short, clean, descriptive 2-5 word titles in Title Case.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      },
      googleConfig
    );

    const clean = result?.replace(/["'`*#\n]/g, '').trim();
    if (clean && clean.length >= 2 && clean.length <= 48) {
      return clean;
    }
    return message.trim().slice(0, 32);
  } catch (error) {
    console.error('[GENERATE_CHAT_TITLE_ERROR]', error);
    return message.trim().slice(0, 32) || 'Untitled chat';
  }
}
