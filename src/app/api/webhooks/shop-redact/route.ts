// pages/api/webhooks/customers-data-request.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const hmac = request.headers.get('x-shopify-hmac-sha256');
  const body = await request.text();

  // Replace with your actual secret
  const secret = process.env.SHOPIFY_API_SECRET!;

  const generatedHmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  // Use timingSafeEqual for security
  const hmacBuffer = Buffer.from(hmac || '', 'utf8');
  const generatedBuffer = Buffer.from(generatedHmac, 'utf8');

  if (
    !hmac ||
    hmacBuffer.length !== generatedBuffer.length ||
    !crypto.timingSafeEqual(hmacBuffer, generatedBuffer)
  ) {
    // HMAC is invalid, return 401
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // HMAC is valid, process the webhook
  // ... your logic here ...

  return new NextResponse('OK', { status: 200 });
}
