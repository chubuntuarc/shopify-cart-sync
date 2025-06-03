import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerShopifyWebhook, registerShopifyScriptTag } from '@/lib/shopify';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Required scopes for the app
const SCOPES = 'read_products,read_orders,write_orders,read_checkouts,write_checkouts,read_customers';

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
      `state=${nonce}&grant_options[]=per-user`;

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
    console.log('TokenData:', tokenData);

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

    const userId = tokenData.associated_user?.id; // Shopify user ID

    // Store shop and access token in database
    const savedShop = await prisma.shop.upsert({
      where: { domain: shop },
      update: {
        accessToken: tokenData.access_token,
        scope: tokenData.scope,
        isActive: true,
        shopData: shopData.shop,
        // userId: userId || undefined, // Si tu modelo Shop lo soporta
      },
      create: {
        domain: shop,
        accessToken: tokenData.access_token,
        scope: tokenData.scope,
        isActive: true,
        shopData: shopData.shop,
        // userId: userId || undefined,
      },
    });

    console.log('Shop saved to database:', savedShop.id);

    try {
      await registerShopifyWebhook(
        shop,
        tokenData.access_token,
        'carts/update',
        `${APP_URL}/api/cart/sync`
      );
      console.log('Webhook carts/update registered');
      await registerShopifyWebhook(
        shop,
        tokenData.access_token,
        'carts/create',
        `${APP_URL}/api/cart/sync`
      );
      console.log('Webhook carts/create registered');
    } catch (err) {
      console.error('Error registering webhook:', err);
    }

    try {
      await registerShopifyScriptTag(
        shop,
        tokenData.access_token,
        `${APP_URL}/scripts/cart-sync.js`
      );
      console.log('ScriptTag registered');  
    } catch (err) {
      console.error('Error registering ScriptTag:', err);
    }

    // Redirect to Shopify admin apps page instead of direct app dashboard
    const shopName = shop.replace('.myshopify.com', '');
    const redirectUrl = `https://admin.shopify.com/store/${shopName}/apps/arco-cart-sync`;
    console.log('Redirecting to:', redirectUrl);
    
    // Crea o actualiza la sesión para el usuario
    if (userId) {
      await prisma.session.upsert({
        where: { id: String(userId) },
        update: {
          sessionToken: tokenData.access_token,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        create: {
          id: String(userId),
          userId: String(userId),
          sessionToken: tokenData.access_token,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    } else {
      console.warn('No userId found in tokenData.associated_user');
    }

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

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');

  if (!shop) {
    return NextResponse.json(
      { error: 'Missing shop parameter. Usage: /api/shopify/install?shop=your-store.myshopify.com' },
      { status: 400 }
    );
  }

  const shopName = shop.replace('.myshopify.com', '');
  const redirectUrl = `https://admin.shopify.com/store/${shopName}/apps/arco-cart-sync`;
  return NextResponse.redirect(redirectUrl);
} 
