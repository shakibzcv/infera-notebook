import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user';
import { generateChatTitle } from '@/lib/llm';

/**
 * DELETE Handler
 * Deletes a specific chat by ID.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ notebookId: string; chatId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId, chatId } = await params;
    if (!notebookId || !chatId) {
      return NextResponse.json({ error: 'notebookId and chatId are required' }, { status: 400 });
    }

    // Verify notebook belongs to user
    const notebook = await prisma.notebook.findFirst({
      where: {
        id: notebookId,
        userId: user.id,
      },
    });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    // Delete the chat. Cascade deletes all its messages.
    await prisma.chat.delete({
      where: {
        id: chatId,
        notebookId,
      },
    });

    return NextResponse.json({ success: true, deletedChatId: chatId });
  } catch (error) {
    console.error('[CHAT DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}

/**
 * PATCH Handler
 * Renames a chat title.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ notebookId: string; chatId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId, chatId } = await params;
    if (!notebookId || !chatId) {
      return NextResponse.json({ error: 'notebookId and chatId are required' }, { status: 400 });
    }

    // Verify notebook belongs to user
    const notebook = await prisma.notebook.findFirst({
      where: {
        id: notebookId,
        userId: user.id,
      },
    });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const body = await req.json();
    const title = body?.title?.trim();

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const chat = await prisma.chat.update({
      where: {
        id: chatId,
        notebookId,
      },
      data: {
        title,
      },
    });

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('[CHAT PATCH]', error);
    return NextResponse.json({ error: 'Failed to update chat title' }, { status: 500 });
  }
}

/**
 * POST Handler
 * Generates or regenerates an AI-crafted title for this chat based on its conversation history.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ notebookId: string; chatId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId, chatId } = await params;
    if (!notebookId || !chatId) {
      return NextResponse.json({ error: 'notebookId and chatId are required' }, { status: 400 });
    }

    // Verify notebook belongs to user
    const notebook = await prisma.notebook.findFirst({
      where: {
        id: notebookId,
        userId: user.id,
      },
    });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const firstUserMsg = await prisma.message.findFirst({
      where: { notebookId, chatId, role: 'user' },
      orderBy: { createdAt: 'asc' },
    });

    if (!firstUserMsg) {
      return NextResponse.json({ error: 'No messages found to generate title' }, { status: 400 });
    }

    const textContent =
      (Array.isArray(firstUserMsg.parts) &&
        (firstUserMsg.parts as any[]).find((p: any) => p.type === 'text')?.text) ||
      '';

    const aiTitle = await generateChatTitle(textContent || 'Untitled chat');

    const chat = await prisma.chat.update({
      where: { id: chatId, notebookId },
      data: { title: aiTitle },
    });

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('[CHAT TITLE GENERATE POST]', error);
    return NextResponse.json({ error: 'Failed to generate title' }, { status: 500 });
  }
}
