import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateSession } from '@/lib/auth';
import { CartService } from '@/lib/cart';


function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
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
  const { cartData, userId } = await request.json();
  try {
    const sessionData = await getOrCreateSession(request);
    // const userId = sessionData.userId;

    // Ahora puedes usar userId para buscar el carrito correcto
    const cart = await CartService.getOrCreateCartByUserId({
      userId,
      shopifyCartId: cartData.token,
      checkoutUrl: "/checkouts/cn/" + cartData.token,
    }, userId);
    
    // Force sync with Shopify
    await CartService.syncWithShopify(cart.id);
    
    // Get updated cart
    const updatedCart = await CartService.getOrCreateCart(sessionData.sessionId);
    console.log("updatedCart", updatedCart);
    
    return NextResponse.json({
      success: true,
      cart: updatedCart,
      checkoutUrl: updatedCart.checkoutUrl,
    }, getCorsHeaders(request.headers.get('origin')));
  } catch (error) {
    console.error('Error syncing cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync cart with Shopify' },
      { status: 500, headers: getCorsHeaders(request.headers.get('origin')) }
    );
  }
} 