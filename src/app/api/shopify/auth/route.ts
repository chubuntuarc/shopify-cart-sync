import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Required scopes for the app
const SCOPES = 'read_products,read_orders,write_orders,read_checkouts,write_checkouts';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!shop) {
    return NextResponse.json(
      { error: 'Missing shop parameter' },
      { status: 400 }
    );
  }

  // If no code, start OAuth flow
  if (!code) {
    const nonce = generateNonce();
    const installUrl = `https://${shop}/admin/oauth/authorize?` +
      `client_id=${SHOPIFY_API_KEY}&` +
      `scope=${SCOPES}&` +
      `redirect_uri=${APP_URL}/api/shopify/auth&` +
      `state=${nonce}`;

    // Store nonce for validation
    // In production, use Redis or database
    return NextResponse.redirect(installUrl);
  }

  // Handle OAuth callback
  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // Get shop information
    const shopResponse = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': tokenData.access_token,
      },
    });

    const shopData = await shopResponse.json();

    // Store shop and access token in database
    await prisma.shop.upsert({
      where: { domain: shop },
      update: {
        accessToken: tokenData.access_token,
        scope: tokenData.scope,
        isActive: true,
        shopData: shopData.shop,
      },
      create: {
        domain: shop,
        accessToken: tokenData.access_token,
        scope: tokenData.scope,
        isActive: true,
        shopData: shopData.shop,
      },
    });

    // Redirect to app dashboard
    return NextResponse.redirect(`${APP_URL}/dashboard?shop=${shop}`);

  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.json(
      { error: 'Failed to install app' },
      { status: 500 }
    );
  }
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
} 
