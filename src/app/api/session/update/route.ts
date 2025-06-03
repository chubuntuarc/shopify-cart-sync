import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateSession } from '@/lib/auth'; // O tu método para identificar la sesión

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    // Obtén la sesión actual (puedes usar cookies, headers, etc.)
    const sessionData = await getOrCreateSession(request);

    // Actualiza la sesión en la base de datos con el userId
    await prisma.session.update({
      where: { id: sessionData.sessionId },
      data: { userId: String(userId) },
    });
    
    // Si no existe, crea la sesión
    if (!sessionData) {
      await prisma.session.create({
        data: {
          id: String(userId),
          userId: String(userId),
          sessionToken: '', // or generate a token if needed
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating session with userId:', error);
    return NextResponse.json({ success: false, error: 'Failed to update session' }, { status: 500 });
  }
}
