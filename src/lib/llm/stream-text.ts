import { DEFAULT_MODEL, isAbortError, isGemini3OrNewer } from './models';
import { StreamTextOptions } from '@/types/ai';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { createTools } from './tools';

/**
 * SSE Text Streaming with Multi-turn Chat, Multimodal support, and Zod Tools.
 */
export async function streamText(options: StreamTextOptions, config: { apiKey: string }) {
  const { messages, context, onFinish, abortSignal } = options;
  const { apiKey } = config;
  const model = options.model || DEFAULT_MODEL;

  const ai = new GoogleGenAI({ apiKey });
  const toolHandlers = context ? createTools(context) : {};

  const functionDeclarations = Object.values(toolHandlers).map((tool) => {
    let parameters: any;
    if (typeof (z as any).toJSONSchema === 'function' && tool.schema) {
      const raw = (z as any).toJSONSchema(tool.schema);
      const { $schema, additionalProperties, ...rest } = raw;
      parameters = rest;
    } else {
      parameters = zodToJsonSchema(tool.schema as any) as any;
    }
    return {
      name: tool.name,
      description: tool.description,
      parameters,
    };
  });

  const tools = functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined;
  const systemInstruction = messages.find((m: any) => m.role === 'system')?.content;

  // History conversion with multimodal support
  const conversationMessages = messages.filter((m: any) => m.role !== 'system');
  const history = conversationMessages.slice(0, -1).map((m: any) => {
    const parts: any[] = [];

    if (Array.isArray(m.parts) && m.parts.length > 0) {
      m.parts.forEach((p: any) => {
        if (p.type === 'text') {
          parts.push({ text: p.text });
        } else if (p.type === 'reasoning') {
          // Skip reasoning/thought parts in history for stability
        } else if (p.type?.startsWith('tool-')) {
          if (p.output) {
            parts.push({
              functionResponse: {
                name: p.type.replace('tool-', ''),
                response: p.output,
                id: p.toolCallId,
              },
            });
          } else {
            parts.push({
              functionCall: {
                name: p.type.replace('tool-', ''),
                args: p.args,
                id: p.toolCallId,
              },
            });
          }
        } else if (p.inlineData) {
          parts.push({ inlineData: p.inlineData });
        }
      });
    } else if (typeof m.content === 'string' && m.content) {
      parts.push({ text: m.content });
    } else if (Array.isArray(m.content)) {
      parts.push(...m.content);
    }

    if (m.toolInvocations && parts.length === 1 && parts[0].text) {
      m.toolInvocations.forEach((ti: any) => {
        if (ti.result !== undefined) {
          parts.push({
            functionResponse: {
              name: ti.toolName,
              response: ti.result,
              id: ti.toolCallId,
            },
          });
        } else {
          parts.push({
            functionCall: {
              name: ti.toolName,
              args: ti.args,
              id: ti.toolCallId,
            },
          });
        }
      });
    }

    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts,
    };
  });

  const lastMessage = conversationMessages[conversationMessages.length - 1];
  const lastMessageParts: any[] = [];

  if (Array.isArray(lastMessage?.parts) && lastMessage.parts.length > 0) {
    lastMessage.parts.forEach((p: any) => {
      const textVal = p.text ?? p.content;
      if (p.type === 'text' && typeof textVal === 'string') {
        lastMessageParts.push({ text: textVal });
      } else if (p.inlineData) {
        lastMessageParts.push({ inlineData: p.inlineData });
      }
    });
  }
  if (lastMessageParts.length === 0) {
    if (typeof lastMessage?.content === 'string' && lastMessage.content) {
      lastMessageParts.push({ text: lastMessage.content });
    } else if (Array.isArray(lastMessage?.content)) {
      lastMessageParts.push(...lastMessage.content);
    }
  }

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let finalContent = '';
      let finalReasoning = '';
      const finalToolInvocations: any[] = [];

      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        console.log(`[Stream] Streaming chat with model: "${model}"`);

        const chatConfig: any = {
          temperature: 1.0,
        };

        if (systemInstruction) {
          chatConfig.systemInstruction = systemInstruction;
        }

        if (tools) {
          chatConfig.tools = tools;
        }

        if (isGemini3OrNewer(model)) {
          chatConfig.thinkingConfig = {
            thinkingLevel: ThinkingLevel.MINIMAL,
            includeThoughts: true,
          };
        }

        const chat = ai.chats.create({
          model,
          history,
          config: chatConfig,
        });

        let currentMessage: any = lastMessageParts;
        let toolCallsAttempt = 0;

        while (toolCallsAttempt < 10) {
          if (abortSignal?.aborted) break;

          const stream = await chat.sendMessageStream({
            message: currentMessage,
          });

          let assistantContent = '';
          let assistantThoughts = '';
          const toolCalls: any[] = [];

          for await (const chunk of stream) {
            if (abortSignal?.aborted) break;

            const parts = chunk.candidates?.[0]?.content?.parts || [];

            for (const part of parts) {
              if (part.thought) {
                const thoughtText = typeof part.text === 'string' ? part.text : '';
                assistantThoughts += thoughtText;
                sendEvent({
                  type: 'reasoning',
                  text: thoughtText,
                  reasoning: thoughtText,
                  content: thoughtText,
                });
              } else if (part.text) {
                assistantContent += part.text;
                sendEvent({
                  type: 'text',
                  text: part.text,
                  content: part.text,
                });
              }

              if (part.functionCall) {
                toolCalls.push(part.functionCall);
              }
            }
          }

          finalContent += assistantContent;
          finalReasoning += assistantThoughts;

          if (toolCalls.length > 0) {
            toolCallsAttempt++;
            const toolResultsParts: any[] = [];

            for (const tc of toolCalls) {
              const toolName = tc.name;
              const args = tc.args || {};

              sendEvent({
                type: 'tool_call',
                id: tc.id,
                toolCallId: tc.id,
                toolName,
                name: toolName,
                args,
              });

              const handler = toolHandlers[toolName];
              if (handler) {
                try {
                  const result = await handler.execute(args);
                  sendEvent({
                    type: 'tool_result',
                    id: tc.id,
                    toolCallId: tc.id,
                    name: toolName,
                    toolName,
                    result,
                    output: result,
                  });
                  finalToolInvocations.push({ toolCallId: tc.id, toolName, args, result });
                  toolResultsParts.push({
                    functionResponse: { name: toolName, response: result, id: tc.id },
                  });
                } catch (toolErr: any) {
                  const msg = toolErr?.message || String(toolErr);
                  sendEvent({
                    type: 'tool_result',
                    id: tc.id,
                    toolCallId: tc.id,
                    name: toolName,
                    toolName,
                    error: msg,
                    result: { error: msg },
                    output: { error: msg },
                  });
                  finalToolInvocations.push({ toolCallId: tc.id, toolName, args, error: msg });
                  toolResultsParts.push({
                    functionResponse: { name: toolName, response: { error: msg }, id: tc.id },
                  });
                }
              } else {
                const error = 'Tool not found';
                sendEvent({
                  type: 'tool_result',
                  id: tc.id,
                  toolCallId: tc.id,
                  name: toolName,
                  toolName,
                  error,
                  result: { error },
                  output: { error },
                });
                toolResultsParts.push({
                  functionResponse: { name: toolName, response: { error }, id: tc.id },
                });
              }
            }

            currentMessage = toolResultsParts;
          } else {
            break;
          }
        }
      } catch (err: any) {
        if (!isAbortError(err) && !abortSignal?.aborted) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[Stream] Error streaming with model "${model}":`, err);
          try {
            sendEvent({ type: 'error', message: msg || 'Streaming error' });
          } catch {}
        }
      } finally {
        if (onFinish && (finalContent || finalReasoning || finalToolInvocations.length > 0)) {
          try {
            await onFinish({
              content: finalContent,
              reasoning: finalReasoning || undefined,
              toolInvocations: finalToolInvocations,
            });
          } catch (finishErr) {
            console.error('[Stream] onFinish callback error:', finishErr);
          }
        }
        try {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch {
          // Stream already closed or aborted
        }
      }
    },
  });
}
