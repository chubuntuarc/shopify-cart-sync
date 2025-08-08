import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateSession, setSessionCookie, registerDevice } from '@/lib/auth';
import { CartService } from '@/lib/cart';

export async function GET(request: NextRequest) {
  try {
    // Para peticiones GET, no intentamos leer el body
    // En su lugar, obtenemos el userId de cookies o headers
    const userId = request.cookies.get('user_id')?.value || 
                   request.headers.get('x-user-id') || 
                   undefined;
    
    const sessionData = await getOrCreateSession(userId, request);
    
    // Register device
    await registerDevice(sessionData.sessionId, request);
    
    // Get associated cart
    const cart = await CartService.getOrCreateCart(sessionData.sessionId);
    
    const response = NextResponse.json({
      success: true,
      session: {
        id: sessionData.sessionId,
        sessionToken: sessionData.sessionToken,
        expires: sessionData.expires.toISOString(),
        cart,
      },
    });

    setSessionCookie(response, sessionData);
    
    return response;
  } catch (error) {
    console.error('Error creating/getting session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    const sessionData = await getOrCreateSession(userId, request);
    
    // Register device
    await registerDevice(sessionData.sessionId, request);
    
    // Get cart
    const cart = await CartService.getOrCreateCart(sessionData.sessionId);
    
    const response = NextResponse.json({
      success: true,
      session: {
        id: sessionData.sessionId,
        sessionToken: sessionData.sessionToken,
        expires: sessionData.expires.toISOString(),
        userId: userId || sessionData.userId,
        cart,
      },
    });

    setSessionCookie(response, sessionData);
    
    return response;
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
}