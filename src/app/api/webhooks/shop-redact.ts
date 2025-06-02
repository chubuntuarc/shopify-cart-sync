// pages/api/webhooks/customers-data-request.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const hmac = request.headers.get('x-shopify-hmac-sha256');
  const body = await request.text();

  // Replace with your actual secret
  const secret = process.env.SHOPIFY_API_SECRET!;

  // Calculate HMAC
  const crypto = await import('crypto');
  const generatedHmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  if (generatedHmac !== hmac) {
    // HMAC is invalid, return 401
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // HMAC is valid, process the webhook
  // ... your logic here ...

  return new NextResponse('OK', { status: 200 });
}
