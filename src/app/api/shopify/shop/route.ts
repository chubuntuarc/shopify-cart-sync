import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ShopifyShopData {
  name?: string;
  email?: string;
  plan_name?: string;
  currency?: string;
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');

  if (!shop) {
    return NextResponse.json(
      { success: false, error: 'Missing shop parameter' },
      { status: 400 }
    );
  }

  try {
    const shopData = await prisma.shop.findUnique({
      where: { domain: shop },
    });

    if (!shopData) {
      return NextResponse.json(
        { success: false, error: 'Shop not found' },
        { status: 404 }
      );
    }

    // Safely cast the JSON data
    const shopInfo = shopData.shopData as ShopifyShopData | null;

    return NextResponse.json({
      success: true,
      shop: {
        id: shopData.id,
        domain: shopData.domain,
        name: shopInfo?.name || shopData.domain,
        email: shopInfo?.email || '',
        plan_name: shopInfo?.plan_name || 'Unknown',
        currency: shopInfo?.currency || 'USD',
      },
    });

  } catch (error) {
    console.error('Error fetching shop:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shop data' },
      { status: 500 }
    );
  }
} 