import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerShopifyScriptTag } from '@/lib/shopify';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Required scopes for the app
const SCOPES = 'read_products,read_orders,write_orders,read_checkouts,write_checkouts,read_customers,read_script_tags,write_script_tags';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  console.log('=== OAuth Process Start ===');
  console.log('Auth callback received:', { 
    shop, 
    hasCode: !!code, 
    state,
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries())
  });

  // Validar variables de entorno
  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
    console.error('❌ Missing Shopify API credentials');
    console.error('SHOPIFY_API_KEY exists:', !!SHOPIFY_API_KEY);
    console.error('SHOPIFY_API_SECRET exists:', !!SHOPIFY_API_SECRET);
    return NextResponse.json(
      { error: 'App not properly configured' },
      { status: 500 }
    );
  }

  if (!shop) {
    console.error('❌ Missing shop parameter');
    return NextResponse.json(
      { error: 'Missing shop parameter' },
      { status: 400 }
    );
  }

  // If no code, start OAuth flow
  if (!code) {
    console.log('🔄 Starting OAuth flow for shop:', shop);
    const nonce = generateNonce();
    const installUrl = `https://${shop}/admin/oauth/authorize?` +
      `client_id=${SHOPIFY_API_KEY}&` +
      `scope=${SCOPES}&` +
      `redirect_uri=${APP_URL}/api/shopify/auth&` +
      `state=${nonce}&grant_options[]=per-user`;

    console.log('📤 Redirecting to Shopify OAuth:', installUrl);
    return NextResponse.redirect(installUrl);
  }

  // Handle OAuth callback
  try {
    console.log('🔄 Starting token exchange for shop:', shop);
    console.log('📝 Code received:', code ? 'YES' : 'NO');
    console.log('🔑 State received:', state ? 'YES' : 'NO');

    // Exchange code for access token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    console.log('📤 Making token request to:', tokenUrl);
    
    const tokenResponse = await fetch(tokenUrl, {
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

    console.log('📥 Token response status:', tokenResponse.status);
    console.log('📥 Token response headers:', Object.fromEntries(tokenResponse.headers.entries()));

    const tokenData = await tokenResponse.json();
    console.log(' TokenData received:', {
      hasAccessToken: !!tokenData.access_token,
      hasScope: !!tokenData.scope,
      hasUserId: !!tokenData.associated_user,
      error: tokenData.error,
      errorDescription: tokenData.error_description
    });

    if (!tokenResponse.ok) {
      console.error('❌ Token exchange failed:', tokenData);
      throw new Error(`Token exchange failed: ${tokenData.error || 'Unknown error'}`);
    }

    if (!tokenData.access_token) {
      console.error('❌ No access token in response:', tokenData);
      throw new Error('Failed to get access token');
    }

    console.log('✅ Token exchange successful, fetching shop data');

    // Get shop information
    const shopApiUrl = `https://${shop}/admin/api/2023-10/shop.json`;
    console.log(' Fetching shop data from:', shopApiUrl);
    
    const shopResponse = await fetch(shopApiUrl, {
      headers: {
        'X-Shopify-Access-Token': tokenData.access_token,
      },
    });

    console.log('📥 Shop API response status:', shopResponse.status);
    console.log('📥 Shop API response headers:', Object.fromEntries(shopResponse.headers.entries()));

    const shopData = await shopResponse.json();
    console.log(' Shop data received:', {
      hasShop: !!shopData.shop,
      shopName: shopData.shop?.name,
      shopEmail: shopData.shop?.email,
      shopPlan: shopData.shop?.plan_name
    });

    if (!shopResponse.ok) {
      console.error('❌ Shop API failed:', shopData);
      throw new Error(`Shop API failed: ${shopData.error || 'Unknown error'}`);
    }

    console.log('✅ Shop data fetched, saving to database');
    console.log('🏪 Shop domain:', shop);
    console.log('🏪 Shop data to save:', shopData.shop);

    const userId = tokenData.associated_user?.id;

    try {
      console.log(' Attempting to save shop to database...');
      
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

      console.log('✅ Shop saved to database successfully:', {
        id: savedShop.id,
        domain: savedShop.domain,
        isActive: savedShop.isActive,
        createdAt: savedShop.createdAt
      });
    } catch (dbError) {
      console.error('❌ Database error saving shop:', dbError);
      console.error('❌ Database error details:', {
        message: dbError instanceof Error ? dbError.message : 'Unknown error',
        stack: dbError instanceof Error ? dbError.stack : undefined
      });
      throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`);
    }

    // Redirect to Shopify admin apps page instead of direct app dashboard
    const shopName = shop.replace('.myshopify.com', '');
    const redirectUrl = `https://admin.shopify.com/store/${shopName}/apps/arco-cart-sync`;
    console.log('🔄 Redirecting to:', redirectUrl);
    
    // Crea o actualiza la sesión para el usuario
    if (userId) {
      console.log('👤 Creating session for user:', userId);
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
      console.log('✅ Session created successfully');
    } else {
      console.warn('⚠️ No userId found in tokenData.associated_user');
    }

    console.log('=== OAuth Process Complete ===');
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ OAuth error details:', error);
    console.error('❌ Error stack:', (error as Error).stack);
    console.error('=== OAuth Process Failed ===');
    
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
