import { prisma } from './prisma';
import { shopifyClient, GET_VARIANT_BY_ID, CREATE_CHECKOUT, UPDATE_CHECKOUT } from './shopify';
import type { Cart, AddToCartRequest } from '@/types';

export class CartService {
  static async getOrCreateCart(sessionId: string): Promise<Cart> {
    let cart = await prisma.cart.findUnique({
      where: {
        sessionId,
      },
      include: {
        items: true,
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          sessionId,
          totalPrice: 0,
          currency: 'USD',
        },
        include: {
          items: true,
        },
      });
    }

    return this.formatCart(cart);
  }

  static async addToCart(sessionId: string, shopifyCart: any): Promise<Cart> {
    const cart = await this.getOrCreateCart(sessionId);

    // 1. Get all current items in your DB cart
    const dbItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
    });

    // 2. Build a map of Shopify cart items by variantId
    const shopifyItemsMap = new Map<string, any>();
    for (const item of shopifyCart.items || []) {
      shopifyItemsMap.set(String(item.variant_id), item);
    }

    // 3. Remove items from DB cart that are not in Shopify cart
    for (const dbItem of dbItems) {
      if (!shopifyItemsMap.has(dbItem.shopifyVariantId)) {
        await prisma.cartItem.delete({ where: { id: dbItem.id } });
      }
    }

    // 4. Add or update items from Shopify cart
    for (const item of shopifyCart.items || []) {
      const variantId = String(item.variant_id);
      const existingItem = dbItems.find(i => i.shopifyVariantId === variantId);

      if (existingItem) {
        // Update quantity and price if needed
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: item.quantity,
            price: item.price / 100,
          },
        });
      } else {
        // Create new item
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            shopifyVariantId: variantId,
            productId: item.product_id,
            title: item.title,
            variant_title: item.variant_title,
            price: item.price / 100,
            quantity: item.quantity,
            image: item.image,
            product_handle: item.handle,
            sku: item.sku,
          },
        });
      }
    }

    // 5. Update cart totals and return
    return await this.updateCartTotals(cart.id);
  }

  static async updateCartItem(sessionId: string, itemId: string, quantity: number): Promise<Cart> {
    const cart = await this.getOrCreateCart(sessionId);

    if (quantity <= 0) {
      // Remove item
      await prisma.cartItem.delete({
        where: {
          id: itemId,
          cartId: cart.id,
        },
      });
    } else {
      // Update quantity
      await prisma.cartItem.update({
        where: {
          id: itemId,
          cartId: cart.id,
        },
        data: {
          quantity,
        },
      });
    }

    return await this.updateCartTotals(cart.id);
  }

  static async removeFromCart(sessionId: string, itemId: string): Promise<Cart> {
    return await this.updateCartItem(sessionId, itemId, 0);
  }

  static async clearCart(sessionId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(sessionId);

    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    await prisma.cart.update({
      where: {
        id: cart.id,
      },
      data: {
        totalPrice: 0,
        shopifyCartId: null,
        checkoutUrl: null,
      },
    });

    return await this.getOrCreateCart(sessionId);
  }

  static async syncWithShopify(cartId: string): Promise<void> {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      return;
    }

    try {
      const lineItems = cart.items.map((item: any) => ({
        variantId: `gid://shopify/ProductVariant/${item.shopifyVariantId}`,
        quantity: item.quantity,
      }));

      if (cart.shopifyCartId) {
        // Update existing checkout
        const response = await shopifyClient.query({
          data: {
            query: UPDATE_CHECKOUT,
            variables: {
              checkoutId: cart.shopifyCartId,
              lineItems,
            },
          },
        });

        const checkout = (response.body as any)?.data?.checkoutLineItemsReplace?.checkout;
        if (checkout) {
          await prisma.cart.update({
            where: { id: cartId },
            data: {
              checkoutUrl: checkout.webUrl,
              totalPrice: parseFloat(checkout.totalPrice),
              currency: checkout.currencyCode,
            },
          });
        }
      } else {
        // Create new checkout
        const response = await shopifyClient.query({
          data: {
            query: CREATE_CHECKOUT,
            variables: {
              input: {
                lineItems,
              },
            },
          },
        });

        const checkout = (response.body as any)?.data?.checkoutCreate?.checkout;
        if (checkout) {
          await prisma.cart.update({
            where: { id: cartId },
            data: {
              shopifyCartId: checkout.id,
              checkoutUrl: checkout.webUrl,
              totalPrice: parseFloat(checkout.totalPrice),
              currency: checkout.currencyCode,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error syncing with Shopify:', error);
    }
  }

  private static async updateCartTotals(cartId: string): Promise<Cart> {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    // Calculate total
    const totalPrice = cart.items.reduce((total: number, item: any) => {
      return total + (item.price * item.quantity);
    }, 0);

    // Update cart
    const updatedCart = await prisma.cart.update({
      where: { id: cartId },
      data: { totalPrice },
      include: { items: true },
    });

    // Sync with Shopify in background
    this.syncWithShopify(cartId).catch(console.error);

    return this.formatCart(updatedCart);
  }

  private static async getVariantFromShopify(variantId: string) {
    try {
      const response = await shopifyClient.query({
        data: {
          query: GET_VARIANT_BY_ID,
          variables: {
            id: `gid://shopify/ProductVariant/${variantId}`,
          },
        },
      });

      const variantData = (response.body as any)?.data?.productVariant;
      
      return variantData;
    } catch (error) {
      console.error('Error fetching variant from Shopify:', error);
      return null;
    }
  }

  private static getMockVariantData(variantId: string) {
    // Mock data for development when Shopify is not configured
    const mockProducts = {
      '123456789': {
        product: {
          id: 'gid://shopify/Product/1',
          title: 'Test Product A',
          handle: 'test-product-a',
        },
        title: 'Size M / Blue Color',
        price: '19.99',
        sku: 'TEST-A-001',
        image: {
          url: 'https://via.placeholder.com/150x150/0066cc/ffffff?text=A',
        },
      },
      '987654321': {
        product: {
          id: 'gid://shopify/Product/2',
          title: 'Test Product B',
          handle: 'test-product-b',
        },
        title: 'Size L / Red Color',
        price: '10.00',
        sku: 'TEST-B-001',
        image: {
          url: 'https://via.placeholder.com/150x150/cc0066/ffffff?text=B',
        },
      },
    };

    return mockProducts[variantId as keyof typeof mockProducts] || {
      product: {
        id: 'gid://shopify/Product/unknown',
        title: 'Unknown Product',
        handle: 'unknown-product',
      },
      title: 'Unknown Variant',
      price: '0.00',
      sku: 'UNKNOWN',
      image: {
        url: 'https://via.placeholder.com/150x150/cccccc/ffffff?text=?',
      },
    };
  }

  private static formatCart(cart: any): Cart {
    return {
      id: cart.id,
      sessionId: cart.sessionId,
      shopifyCartId: cart.shopifyCartId,
      checkoutUrl: cart.checkoutUrl,
      totalPrice: cart.totalPrice || 0,
      currency: cart.currency || 'USD',
      items: cart.items.map((item: any) => ({
        id: item.id,
        shopifyVariantId: item.shopifyVariantId,
        productId: item.productId,
        title: item.title,
        variant_title: item.variant_title,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        product_handle: item.product_handle,
        sku: item.sku,
      })),
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    };
  }

  private static getVariantImageUrl(variantData: any): string {
    // Handle real Shopify variant data
    if (variantData.image && variantData.image.url) {
      return variantData.image.url;
    }
    
    // Handle Shopify variant with image id reference
    if (variantData.image && variantData.image.src) {
      return variantData.image.src;
    }
    
    // Fallback to product's first image if variant doesn't have specific image
    if (variantData.product && variantData.product.images && variantData.product.images.length > 0) {
      const firstImage = variantData.product.images[0];
      return firstImage.src || firstImage.url || '';
    }
    
    // Handle product images array from GraphQL response
    if (variantData.product && variantData.product.images && variantData.product.images.edges) {
      const firstImage = variantData.product.images.edges[0];
      if (firstImage && firstImage.node) {
        return firstImage.node.url || firstImage.node.src || '';
      }
    }
    
    // Mock data fallback
    if (variantData.image && typeof variantData.image === 'object' && variantData.image.url) {
      return variantData.image.url;
    }
    
    // Default placeholder
    return 'https://via.placeholder.com/150x150/cccccc/ffffff?text=No+Image';
  }

  static async getOrCreateCartByUserId(cartData: any, userId: string) {
    const session = await prisma.session.findFirst({ where: { id: userId } });
    if (!session) throw new Error('No session found for user');

    let cart = await prisma.cart.findFirst({ where: { sessionId: session.id } });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          sessionId: userId,
          totalPrice: 0,
          currency: 'USD',
          shopifyCartId: cartData.token,
          checkoutUrl: "/checkouts/cn/" + cartData.token,
        },
      });
    } else {
      cart = await prisma.cart.update({
        where: { id: cart.id },
        data: cartData,
      });
    }
    return this.formatCart(cart);
  }
}
