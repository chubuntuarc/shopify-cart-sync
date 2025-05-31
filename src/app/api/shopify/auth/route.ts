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

  console.log('Auth callback received:', { shop, hasCode: !!code, state });

  if (!shop) {
    console.error('Missing shop parameter');
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
    console.log('Starting token exchange for shop:', shop);

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
    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      throw new Error(`Token exchange failed: ${tokenData.error || 'Unknown error'}`);
    }

    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData);
      throw new Error('Failed to get access token');
    }

    console.log('Token exchange successful, fetching shop data');

    // Get shop information
    const shopResponse = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': tokenData.access_token,
      },
    });

    const shopData = await shopResponse.json();
    console.log('Shop API response status:', shopResponse.status);

    if (!shopResponse.ok) {
      console.error('Shop API failed:', shopData);
      throw new Error(`Shop API failed: ${shopData.error || 'Unknown error'}`);
    }

    console.log('Shop data fetched, saving to database');

    // Store shop and access token in database
    const savedShop = await prisma.shop.upsert({
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

    console.log('Shop saved to database:', savedShop.id);

    // Redirect to Shopify admin apps page instead of direct app dashboard
    const shopName = shop.replace('.myshopify.com', '');
    const redirectUrl = `https://admin.shopify.com/store/${shopName}/apps/arco-cart-sync`;
    console.log('Redirecting to:', redirectUrl);
    
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('OAuth error details:', error);
    console.error('Error stack:', (error as Error).stack);
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to install app',
        details: errorMessage,
        shop: shop,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
} 
