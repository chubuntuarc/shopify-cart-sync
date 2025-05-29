import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateSession } from '@/lib/auth';
import { CartService } from '@/lib/cart';

export async function POST(request: NextRequest) {
  try {
    const sessionData = await getOrCreateSession(request);
    const cart = await CartService.getOrCreateCart(sessionData.sessionId);
    
    // Force sync with Shopify
    await CartService.syncWithShopify(cart.id);
    
    // Get updated cart
    const updatedCart = await CartService.getOrCreateCart(sessionData.sessionId);
    
    return NextResponse.json({
      success: true,
      cart: updatedCart,
      checkoutUrl: updatedCart.checkoutUrl,
    });
  } catch (error) {
    console.error('Error syncing cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync cart with Shopify' },
      { status: 500 }
    );
  }
} 