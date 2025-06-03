import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateSession } from '@/lib/auth';
import { CartService } from '@/lib/cart';

export async function GET(request: NextRequest) {
  const { userId } = await request.json();
  try {
    const sessionData = await getOrCreateSession(request);
    const cart = userId
      ? await CartService.getOrCreateCartByUserId(userId)
      : await CartService.getOrCreateCart(sessionData.sessionId);
    
    return NextResponse.json({
      success: true,
      cart,
      userId: userId || null,
    });
  } catch (error) {
    console.error('Error getting cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get cart' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionData = await getOrCreateSession(request);
    const body = await request.json();
    const { variantId, quantity, properties } = body;

    if (!variantId || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Missing variantId or quantity' },
        { status: 400 }
      );
    }

    const cart = await CartService.addToCart(sessionData.sessionId, {
      variantId,
      quantity: parseInt(quantity),
      properties,
    });

    return NextResponse.json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add to cart' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionData = await getOrCreateSession(request);
    const cart = await CartService.clearCart(sessionData.sessionId);
    
    return NextResponse.json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear cart' },
      { status: 500 }
    );
  }
} 