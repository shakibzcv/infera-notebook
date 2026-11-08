/**
 * Semantic Chat API
 * Orchestrates the RAG (Retrieval-Augmented Generation) chat experience.
 * Handles user message persistence, credit management, and AI streaming.
 */
import { streamText, googleConfig, generateChatTitle } from '@/lib/llm';
import { getCurrentUser } from '@/lib/user';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { MessageRole } from '@/generated/prisma/enums';
import { deductCredit } from '@/lib/credits';
import { INTERACTIVE_AGENT_SYSTEM_PROMPT } from '@/lib/prompts';

// Force dynamic execution on Node.js runtime and disable edge/static response buffering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Main Chat Handler (POST)
 * 1. Authenticates the user.
 * 2. Deducts a credit for the interaction.
 * 3. Persists the user's message to the database.
 * 4. Initiates a streaming response from the LLM with context.
 * 5. Persists the AI's response upon completion of the stream.
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sourceIds, messages, notebookId, chatId } = await req.json();

    if (!notebookId) {
      return NextResponse.json({ error: 'notebookId is required' }, { status: 400 });
    }

    // Verify notebook ownership to prevent IDOR vulnerabilities
    const notebook = await prisma.notebook.findFirst({
      where: {
        id: notebookId,
        userId: user.id,
      },
    });

    if (!notebook) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this notebook' },
        { status: 403 }
      );
    }

    // Resolve or create active chat
    let activeChatId = chatId;
    if (!activeChatId) {
      let chat = await prisma.chat.findFirst({
        where: { notebookId },
        orderBy: { createdAt: 'desc' },
      });
      if (!chat) {
        chat = await prisma.chat.create({
          data: {
            notebookId,
            title: 'Untitled chat',
          },
        });
      }
      activeChatId = chat.id;
    }

    // Get the last message (user's current message)
    const lastMessage = messages?.[messages?.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 });
    }

    // Deduct credit after verifying notebook ownership and input payload
    const success = await deductCredit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Credits exhausted. Please wait for the daily reset.' },
        { status: 403 }
      );
    }

    // Capture parts for persistence - handle both format variations
    const userParts =
      lastMessage.parts ||
      (lastMessage.content ? [{ type: 'text', text: lastMessage.content }] : []);

    await prisma.message.create({
      data: {
        notebookId: notebookId,
        chatId: activeChatId,
        role: MessageRole.user,
        parts: userParts,
      },
    });

    // Auto-update chat title if still default or first exchange
    let titlePromise: Promise<string | null> | null = null;
    try {
      const currentChat = await prisma.chat.findUnique({
        where: { id: activeChatId },
        select: { title: true, _count: { select: { messages: true } } },
      });

      const textContent =
        (typeof lastMessage.content === 'string' && lastMessage.content) ||
        (Array.isArray(userParts) && userParts.find((p: any) => p.type === 'text')?.text) ||
        '';

      const trimmedText = textContent.trim();
      const quickTitle = trimmedText.slice(0, 32);

      const isDefaultOrFirst =
        currentChat &&
        (currentChat.title === 'New Chat' ||
          currentChat.title === 'New chat' ||
          currentChat.title === 'Untitled chat' ||
          /^Chat \d+$/.test(currentChat.title) ||
          currentChat.title === quickTitle ||
          currentChat._count.messages <= 2);

      if (isDefaultOrFirst && trimmedText) {
        if (
          currentChat.title === 'New Chat' ||
          currentChat.title === 'New chat' ||
          currentChat.title === 'Untitled chat' ||
          /^Chat \d+$/.test(currentChat.title)
        ) {
          await prisma.chat.update({
            where: { id: activeChatId },
            data: { title: quickTitle },
          });
        }

        // Generate AI title concurrently in the background during streaming
        titlePromise = generateChatTitle(trimmedText).catch((err) => {
          console.warn('[CHAT] Background AI title generation failed:', err);
          return null;
        });
      }
    } catch (e) {
      console.warn('[CHAT] Auto-titling skipped:', e);
    }

    // Create tool context with user and notebook information
    const toolContext = {
      notebookId: notebookId,
      sourceIds: sourceIds || [],
      userId: user.id,
    };

    // Query active sources to provide the AI agent with document-level awareness
    const targetSourceIds =
      Array.isArray(sourceIds) && sourceIds.length > 0 ? sourceIds : undefined;
    const activeSources = await prisma.source.findMany({
      where: {
        notebookId,
        ...(targetSourceIds ? { id: { in: targetSourceIds } } : {}),
      },
      select: { id: true, sourceTitle: true, type: true },
    });

    let activeSourcesContext = '';
    if (activeSources.length > 0) {
      const sourceList = activeSources
        .map((s, idx) => `${idx + 1}. "${s.sourceTitle}" (Type: ${s.type}) [Source ID: ${s.id}]`)
        .join('\n');
      activeSourcesContext = `\n\n<active_sources>\nActive Sources in Context (${activeSources.length} available):\n${sourceList}\n\nWhen the user asks to "explain the doc", "summarize", or refers to their materials, use the source title(s) above to formulate targeted, precise queries for searchInVectorStore.\n</active_sources>`;
    }

    // Save assistant message after streaming completes
    const onFinish = async (result: {
      content: string;
      reasoning?: string;
      toolInvocations: any[];
    }) => {
      try {
        const assistantParts: any[] = [];

        // Add reasoning part if it exists
        if (result.reasoning) {
          assistantParts.push({ type: 'reasoning', reasoning: result.reasoning });
        }

        // Add text part
        assistantParts.push({ type: 'text', text: result.content });

        // Add tool invocations as separate parts for persistence
        if (result.toolInvocations && result.toolInvocations.length > 0) {
          result.toolInvocations.forEach((ti) => {
            assistantParts.push({
              type: `tool-${ti.toolName}`,
              toolCallId: ti.toolCallId,
              args: ti.args,
              state: 'output-available',
              output: ti.result,
            });
          });
        }

        await prisma.message.create({
          data: {
            notebookId: notebookId,
            chatId: activeChatId,
            role: MessageRole.assistant,
            parts: assistantParts,
          },
        });

        // Await AI title generation and persist if ready
        if (titlePromise) {
          try {
            const aiTitle = await titlePromise;
            if (aiTitle && aiTitle.trim() && aiTitle !== 'Untitled chat') {
              await prisma.chat.update({
                where: { id: activeChatId },
                data: { title: aiTitle.trim() },
              });
              console.log(`[CHAT] Auto-updated chat title to: "${aiTitle.trim()}"`);
            }
          } catch (err) {
            console.warn('[CHAT] Failed to persist AI title in onFinish:', err);
          }
        }
      } catch (error) {
        console.error('[CHAT] Failed to save assistant message:', error);
      }
    };

    const systemPromptWithSources = `${INTERACTIVE_AGENT_SYSTEM_PROMPT}${activeSourcesContext}`;

    const stream = await streamText(
      {
        messages: [{ role: 'system', content: systemPromptWithSources }, ...messages],
        context: toolContext,
        onFinish,
        abortSignal: req.signal,
      },
      googleConfig
    );

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[CHAT]', error);
    return NextResponse.json({ error: 'Failed to chat' }, { status: 500 });
  }
}
