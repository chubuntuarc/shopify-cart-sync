import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateSession } from '@/lib/auth'; // O tu método para identificar la sesión

function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400, headers: corsHeaders });
    }

    await prisma.session.upsert({
      where: { id: String(userId) },
      update: { userId: String(userId) },
      create: {
        id: String(userId),
        userId: String(userId),
        sessionToken: '',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error updating session with userId:', error);
    return NextResponse.json({ success: false, error: 'Failed to update session' }, { status: 500, headers: corsHeaders });
  }
}
