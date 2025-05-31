import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Shopify sends customer info in the webhook payload
    const customerId = body.id || body.customer?.id;

    if (!customerId) {
      return NextResponse.json({ success: false, error: 'No customer ID in webhook' }, { status: 400 });
    }

    // Busca o crea la sesión/cart en tu base de datos
    let session = await prisma.session.findFirst({ where: { userId: String(customerId) } });
    if (!session) {
      session = await prisma.session.create({
        data: {
          userId: String(customerId),
          sessionToken: crypto.randomUUID(),
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        },
      });
      // Crea el carrito si lo necesitas
      await prisma.cart.create({
        data: {
          sessionId: session.id,
          totalPrice: 0,
          currency: 'USD',
        },
      });
    }

    // Puedes agregar lógica adicional aquí

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling customers/login webhook:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
