import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Required scopes for the app
const SCOPES = 'read_products,read_orders,write_orders,read_checkouts,write_checkouts,read_customers,write_script_tags';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');

  if (!shop) {
    return NextResponse.json(
      { error: 'Missing shop parameter. Usage: /api/shopify/install?shop=your-store.myshopify.com' },
      { status: 400 }
    );
  }

  // Ensure shop domain format
  const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;

  // Generate nonce for security
  const nonce = generateNonce();
  
  // Create installation URL
  const installUrl = `https://${shopDomain}/admin/oauth/authorize?` +
    `client_id=${SHOPIFY_API_KEY}&` +
    `scope=${SCOPES}&` +
    `redirect_uri=${APP_URL}/api/shopify/auth&` +
    `state=${nonce}`;

  // Redirect to Shopify for installation
  return NextResponse.redirect(installUrl);
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
