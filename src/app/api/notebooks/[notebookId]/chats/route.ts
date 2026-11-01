import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user';

/**
 * GET Handler
 * Fetches all chats for a notebook in reverse chronological order.
 * Automatically migrates any legacy unassigned messages or initializes a first chat if none exist.
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

    let chats = await prisma.chat.findMany({
      where: {
        notebookId,
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Check if there are legacy messages without a chatId
    const legacyMessages = await prisma.message.findMany({
      where: {
        notebookId,
        chatId: null,
      },
      select: { id: true },
    });

    if (chats.length === 0) {
      // Only create initial chat if there are legacy messages to adopt
      if (legacyMessages.length > 0) {
        const initialChat = await prisma.chat.create({
          data: {
            notebookId,
            title: 'Untitled chat',
          },
        });

        await prisma.message.updateMany({
          where: {
            notebookId,
            chatId: null,
          },
          data: {
            chatId: initialChat.id,
          },
        });

        chats = [
          {
            ...initialChat,
            _count: { messages: legacyMessages.length },
          },
        ];
      }
    } else if (legacyMessages.length > 0) {
      // Assign legacy messages to the earliest chat
      await prisma.message.updateMany({
        where: {
          notebookId,
          chatId: null,
        },
        data: {
          chatId: chats[0].id,
        },
      });
    }

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('[CHATS GET]', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

/**
 * POST Handler
 * Creates a new chat inside the specified notebook.
 */
export async function POST(req: Request, { params }: { params: Promise<{ notebookId: string }> }) {
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

    let title = 'Untitled chat';
    try {
      const body = await req.json();
      if (body?.title && typeof body.title === 'string' && body.title.trim()) {
        title = body.title.trim();
      }
    } catch {
      title = 'Untitled chat';
    }

    const chat = await prisma.chat.create({
      data: {
        notebookId,
        title,
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('[CHATS POST]', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}

/**
 * DELETE Handler
 * Deletes a specific chat (via ?chatId=...) or all chats in the notebook.
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

    if (chatId) {
      // Delete specific chat - Prisma cascade will delete all associated messages
      await prisma.chat.delete({
        where: {
          id: chatId,
          notebookId,
        },
      });

      return NextResponse.json({ success: true, deletedChatId: chatId });
    }

    // Delete all chats and legacy messages in the notebook
    await prisma.chat.deleteMany({
      where: {
        notebookId,
      },
    });

    await prisma.message.deleteMany({
      where: {
        notebookId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CHATS DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete chats' }, { status: 500 });
  }
}
