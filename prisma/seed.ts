import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create test session
  const testSession = await prisma.session.create({
    data: {
      sessionToken: 'test-session-token-123',
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      userId: 'test-user-123',
    },
  })

  console.log('✅ Created test session:', testSession.id)
 
  // Create test cart
  const testCart = await prisma.cart.create({
    data: {
      sessionId: testSession.id,
      totalPrice: 29.99,
      currency: 'USD',
      shopifyCartId: 'gid://shopify/Cart/test-123',
      checkoutUrl: 'https://test-store.myshopify.com/checkout/test',
    },
  })

  console.log('✅ Created test cart:', testCart.id)

  // Create test items
  const testItems = await Promise.all([
    prisma.cartItem.create({
      data: {
        cartId: testCart.id,
        shopifyVariantId: '123456789',
        productId: 'gid://shopify/Product/1',
        title: 'Test Product A',
        variant_title: 'Size M / Blue Color',
        price: 19.99,
        quantity: 1,
        image: 'https://via.placeholder.com/150x150/0066cc/ffffff?text=A',
        product_handle: 'test-product-a',
        sku: 'TEST-A-001',
      },
    }),
    prisma.cartItem.create({
      data: {
        cartId: testCart.id,
        shopifyVariantId: '987654321',
        productId: 'gid://shopify/Product/2',
        title: 'Test Product B',
        variant_title: 'Size L / Red Color',
        price: 10.00,
        quantity: 1,
        image: 'https://via.placeholder.com/150x150/cc0066/ffffff?text=B',
        product_handle: 'test-product-b',
        sku: 'TEST-B-001',
      },
    }),
  ])

  console.log('✅ Created test items:', testItems.length)

  // Create test device
  const testDevice = await prisma.device.create({
    data: {
      sessionId: testSession.id,
      deviceId: 'test-device-fingerprint-123',
      userAgent: 'Mozilla/5.0 (Test Browser)',
      ipAddress: '127.0.0.1',
      isActive: true,
    },
  })

  console.log('✅ Created test device:', testDevice.id)

  console.log('🎉 Seeding completed!')
  console.log('')
  console.log('📋 Test data created:')
  console.log(`   Session Token: ${testSession.sessionToken}`)
  console.log(`   Cart ID: ${testCart.id}`)
  console.log(`   Items: ${testItems.length}`)
  console.log(`   Device ID: ${testDevice.deviceId}`)
  console.log('')
  console.log('🧪 You can use this data to test the application in the frontend')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }) 