// npx terser scripts/cart-sync.js -o public/scripts/cart-sync.min.js --compress --mangle

(function() {
  const appURL = "https://arco-henna.vercel.app";
  let customerId = null;

  function getCustomerId() {
    const id = typeof window !== 'undefined' && window.CUSTOMER_ID ? String(window.CUSTOMER_ID) : null;
    return id;
  }

  async function getLocalCart() {
    try {
      const response = await fetch('/cart.js', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const cart = await response.json();
        return cart;
      }
    } catch (err) {}
    return null;
  }

  async function fetchBackendCart() {
    if (!customerId) return null;
    try {
      const response = await fetch(`${appURL}/api/cart?userId=${encodeURIComponent(customerId)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        return data.cart || null;
      }
    } catch (err) {}
    return null;
  }

  async function syncLocalCartToBackend(cart) {
    if (!customerId) return null;
    try {
      await fetch(appURL + '/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: customerId,
          cartData: cart || {}
        }),
      });
    } catch (err) {}
  }

  function cartsAreEqual(cartA, cartB) {
    if (!cartA || !cartB) return false;
    const itemsEqual = (cartA.items?.length || 0) === (cartB.items?.length || 0);
    // Shopify local cart total_price is in cents, backend may be in units
    const localPrice = cartA.total_price ? cartA.total_price / 100 : 0;
    const backendPrice = cartB.totalPrice || 0;
    const priceEqual = localPrice === backendPrice;
    const equal = itemsEqual && priceEqual;
    return equal;
  }

  async function replaceShopifyCartWith(cart) {
    try {
      localStorage.setItem('cart_sync_reloaded', '1');
      await fetch('/cart/clear.js', { method: 'POST', credentials: 'include' });
      if (cart && cart.items && cart.items.length > 0) {
        const items = cart.items.map(item => ({
          id: item.shopifyVariantId || item.variantId || item.variant_id,
          quantity: item.quantity,
          properties: item.properties || undefined,
        }));
        await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ items }),
        });
      }
      window.location.reload();
    } catch (error) {}
  }

  async function initialSync() {
    if (localStorage.getItem('cart_sync_reloaded')) {
      localStorage.removeItem('cart_sync_reloaded');
      return;
    }
    customerId = getCustomerId();
    if (!customerId) {
      return;
    }
    const [localCart, backendCart] = await Promise.all([
      getLocalCart(),
      fetchBackendCart()
    ]);

    const localHasItems = localCart && localCart.items && localCart.items.length > 0;
    const backendHasItems = backendCart && backendCart.items && backendCart.items.length > 0;

    if (!localHasItems && !backendHasItems) {
      return;
    }

    if (localHasItems && !backendHasItems) {
      await syncLocalCartToBackend(localCart);
      return;
    }

    if (!localHasItems && backendHasItems) {
      await replaceShopifyCartWith(backendCart);
      return;
    }

    // Ambos tienen items
    if (cartsAreEqual(localCart, backendCart)) {
      return;
    } else {
      await replaceShopifyCartWith(backendCart);
      return;
    }
  }

  function interceptCartRequests() {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      let url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
      if (url && url.match(/\/cart\/(add|update|change|clear)(\.js)?/)) {
        setTimeout(async () => {
          const cart = await getLocalCart();
          await syncLocalCartToBackend(cart);
        }, 1500);
      }
      return originalFetch.apply(this, args);
    };

    const originalOpen = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this.addEventListener('load', function() {
        if (url && url.match(/\/cart\/(add|update|change)(\.js)?/)) {
          setTimeout(async () => {
            const cart = await getLocalCart();
            await syncLocalCartToBackend(cart);
          }, 1500);
        }
      });
      return originalOpen.call(this, method, url, ...rest);
    };
  }

  // --- INIT ---
  const onLoad = () => {
    initialSync();
    setTimeout(interceptCartRequests, 1000);
  }

  if (document.readyState === "complete") {
    onLoad();
  } else {
    window.addEventListener("load", onLoad);
  }
})();
