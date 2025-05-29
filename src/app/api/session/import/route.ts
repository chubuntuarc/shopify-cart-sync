import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromToken, setSessionCookie, registerDevice } from '@/lib/auth';
import { CartService } from '@/lib/cart';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken } = body;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Session token is required' },
        { status: 400 }
      );
    }

    // Get session from token
    const session = await getSessionFromToken(sessionToken);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session token' },
        { status: 404 }
      );
    }

    // Register this device with the existing session
    await registerDevice(session.id, request);
    
    // Get cart
    const cart = await CartService.getOrCreateCart(session.id);
    
    const sessionData = {
      sessionId: session.id,
      sessionToken: session.sessionToken,
      expires: session.expires,
      userId: session.userId || undefined,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Session imported successfully',
      session: {
        id: session.id,
        sessionToken: session.sessionToken,
        expires: session.expires.toISOString(),
        userId: session.userId,
        cart,
      },
    });

    // Set cookie in this browser
    setSessionCookie(response, sessionData);
    
    return response;
  } catch (error) {
    console.error('Error importing session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import session' },
      { status: 500 }
    );
  }
} 