import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const hmac = request.headers.get('x-shopify-hmac-sha256');
  const body = await request.text();
  const secret = process.env.SHOPIFY_API_SECRET!;

  const generatedHmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  const hmacBuffer = Buffer.from(hmac || '', 'utf8');
  const generatedBuffer = Buffer.from(generatedHmac, 'utf8');

  if (
    !hmac ||
    hmacBuffer.length !== generatedBuffer.length ||
    !crypto.timingSafeEqual(hmacBuffer, generatedBuffer)
  ) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // TODO: Borrar la información del cliente según el payload recibido
  // const payload = JSON.parse(body);

  return new NextResponse('OK', { status: 200 });
}