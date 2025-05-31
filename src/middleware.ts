import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Allow CORS for all API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200,
        headers: response.headers
      });
    }
  }

  // Allow embedding in Shopify admin for dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // Remove any X-Frame-Options to allow iframe embedding
    response.headers.delete('X-Frame-Options');
    
    // Set Content-Security-Policy to allow Shopify iframe embedding
    response.headers.set(
      'Content-Security-Policy',
      "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com https://*.shopify.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'self' 'unsafe-inline';"
    );
  }

  // Ensure no X-Frame-Options for any dashboard content
  if (request.nextUrl.pathname.includes('dashboard')) {
    response.headers.delete('X-Frame-Options');
  }
  
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/dashboard',
  ],
}; 