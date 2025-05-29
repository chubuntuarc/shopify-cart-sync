import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateSession } from '@/lib/auth';
import { CartService } from '@/lib/cart';

export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const sessionData = await getOrCreateSession(request);
    const body = await request.json();
    const { quantity } = body;

    if (quantity === undefined || quantity < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid quantity' },
        { status: 400 }
      );
    }

    const cart = await CartService.updateCartItem(
      sessionData.sessionId,
      params.itemId,
      parseInt(quantity)
    );

    return NextResponse.json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update cart item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const sessionData = await getOrCreateSession(request);
    const cart = await CartService.removeFromCart(
      sessionData.sessionId,
      params.itemId
    );

    return NextResponse.json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error('Error removing cart item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove cart item' },
      { status: 500 }
    );
  }
} 