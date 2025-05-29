export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  productType: string;
  tags: string[];
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  options: ShopifyOption[];
}

export interface ShopifyVariant {
  id: string;
  productId: string;
  title: string;
  price: string;
  sku?: string;
  inventory_quantity: number;
  weight?: number;
  image?: ShopifyImage;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
}

export interface ShopifyImage {
  id: string;
  url: string;
  altText?: string;
  width: number;
  height: number;
}

export interface ShopifyOption {
  id: string;
  name: string;
  values: string[];
}

export interface CartItem {
  id: string;
  shopifyVariantId: string;
  productId: string;
  title: string;
  variant_title?: string;
  price: number;
  quantity: number;
  image?: string;
  product_handle?: string;
  sku?: string;
}

export interface Cart {
  id: string;
  sessionId: string;
  shopifyCartId?: string;
  checkoutUrl?: string;
  totalPrice: number;
  currency: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  sessionToken: string;
  userId?: string;
  expires: string;
  cart?: Cart;
}

export interface Device {
  id: string;
  sessionId: string;
  deviceId: string;
  userAgent?: string;
  ipAddress?: string;
  lastAccess: string;
  isActive: boolean;
}

export interface AddToCartRequest {
  variantId: string;
  quantity: number;
  properties?: Record<string, any>;
}

export interface UpdateCartItemRequest {
  itemId: string;
  quantity: number;
}

export interface CartResponse {
  success: boolean;
  cart?: Cart;
  error?: string;
}

export interface SessionResponse {
  success: boolean;
  session?: Session;
  sessionToken?: string;
  error?: string;
} 