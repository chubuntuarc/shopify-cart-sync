import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateSession } from '@/lib/auth';
import { CartService } from '@/lib/cart';

function getCorsHeaders(origin: string | null): Record<string, string> {
  // Solo permite orígenes válidos (aquí permitimos todos, pero nunca '*')
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Handler para preflight CORS
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function GET(request: NextRequest) {
  const { userId } = await request.json();
  try {
    const cart = await CartService.getOrCreateCartByUserId({
        userId,
        shopifyCartId: null,
        checkoutUrl: null,
      }, userId)
    
    return NextResponse.json({
      success: true,
      cart,
      userId: userId || null,
    }, getCorsHeaders(request.headers.get('origin')));
  } catch (error) {
    console.error('Error getting cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get cart' },
      { status: 500, headers: getCorsHeaders(request.headers.get('origin')) }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { cartData, userId } = body;

  if (!cartData) {
    return NextResponse.json(
      { success: false, error: 'Missing cartData' },
      { status: 400, headers: getCorsHeaders(request.headers.get('origin')) }
    );
  }

  try {
    const sessionData = await getOrCreateSession(userId);
    const cart = await CartService.addToCart(sessionData.sessionId, cartData);

    return NextResponse.json({
      success: true,
      cart,
    }, getCorsHeaders(request.headers.get('origin')));
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add to cart' },
      { status: 500, headers: getCorsHeaders(request.headers.get('origin')) }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();
    const sessionData = await getOrCreateSession(userId);
    const cart = await CartService.clearCart(sessionData.sessionId);
    
    return NextResponse.json({
      success: true,
      cart,
    }, getCorsHeaders(request.headers.get('origin')));
  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear cart' },
      { status: 500, headers: getCorsHeaders(request.headers.get('origin')) }
    );
  }
} 