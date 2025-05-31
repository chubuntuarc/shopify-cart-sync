import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Obtener el userId autenticado desde la cabecera
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 });
  }

  // Buscar la sesión existente
  let session = await prisma.session.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  // Si no existe, crear una nueva
  if (!session) {
    const sessionData = await createSession(userId);
    return NextResponse.json({
      success: true,
      sessionToken: sessionData.sessionToken,
    });
  }

  return NextResponse.json({
    success: true,
    sessionToken: session.sessionToken,
  });
} 