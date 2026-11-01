/**
 * Notebook Collection API
 * Manages the high-level notebook entities for a user.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user';

/**
 * GET Handler
 * Fetches a paginated list of notebooks for the current user.
 * Supports partial title search and content-based searching within related notes.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 10;
    const skip = (page - 1) * limit;

    console.log(`[API_GET_NOTEBOOKS] Query: "${query}", Page: ${page}`);

    const where: any = {
      AND: [
        { userId: user.id },
        ...(query
          ? [
              {
                OR: [
                  { title: { contains: query, mode: 'insensitive' } },
                  {
                    notes: {
                      some: {
                        OR: [
                          { content: { contains: query, mode: 'insensitive' } },
                          { noteTitle: { contains: query, mode: 'insensitive' } },
                        ],
                      },
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    };

    const [notebooks, totalCount] = await Promise.all([
      prisma.notebook.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notebook.count({ where }),
    ]);

    return NextResponse.json({ notebooks, totalCount, totalPages: Math.ceil(totalCount / limit) });
  } catch (error) {
    console.error('[GET_NOTEBOOKS]', error);
    return NextResponse.json({ error: 'Failed to fetch notebooks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const title =
      typeof body?.title === 'string' && body.title.trim().length > 0 ? body.title.trim() : null;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const notebook = await prisma.notebook.create({
      data: {
        userId: user.id,
        title,
      },
    });

    return NextResponse.json({ notebook }, { status: 201 });
  } catch (error) {
    console.error('[CREATE_NOTEBOOK]', error);
    return NextResponse.json({ error: 'Failed to create notebook' }, { status: 500 });
  }
}
