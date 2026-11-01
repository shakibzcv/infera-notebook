import { NextResponse } from 'next/server';
import { GOOGLE_CLIENT_ID } from '@/lib/env';

export async function GET() {
  return NextResponse.json({
    clientId: GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  });
}
