/**
 * Notebook Messages API
 * Handles the storage and retrieval of chat history for a specific notebook/chat.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user';

/**
 * GET Handler
 * Fetches chat messages for a notebook (optionally filtered by chatId) in chronological order.
 */
export async function GET(req: Request, { params }: { params: Promise<{ notebookId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId } = await params;
    if (!notebookId) {
      return NextResponse.json({ error: 'notebookId is required' }, { status: 400 });
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

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    // Fetch messages for this notebook & optional chat, ordered by creation date
    const dbMessages = await prisma.message.findMany({
      where: {
        notebookId,
        ...(chatId ? { chatId } : {}),
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({ messages: dbMessages });
  } catch (error) {
    console.error('[MESSAGES GET]', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

/**
 * DELETE Handler
 * Deletes chat messages (optionally by chatId or for the whole notebook).
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ notebookId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId } = await params;
    if (!notebookId) {
      return NextResponse.json({ error: 'notebookId is required' }, { status: 400 });
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

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    // Delete messages for this specific chat or for the entire notebook
    await prisma.message.deleteMany({
      where: {
        notebookId,
        ...(chatId ? { chatId } : {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MESSAGES DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 });
  }
}
