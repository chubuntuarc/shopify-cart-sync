// npx terser scripts/cart-sync.js -o public/scripts/cart-sync.min.js --compress --mangle

(function() {
  const appURL = "https://arco-henna.vercel.app";
  let customerId = null;

  function getCustomerId() {
    const id = typeof window !== 'undefined' && window.CUSTOMER_ID ? String(window.CUSTOMER_ID) : null;
    console.log('[CartSync] Customer ID:', id);
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
        console.log('[CartSync] Local cart fetched:', cart);
        return cart;
      }
    } catch (err) {
      console.error('[CartSync] Error fetching Shopify AJAX cart:', err);
    }
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
        console.log('[CartSync] Backend cart fetched:', data.cart);
        return data.cart || null;
      }
    } catch (err) {
      console.error('[CartSync] Error fetching backend cart:', err);
    }
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
      console.log('[CartSync] Local cart synced to backend.');
    } catch (err) {
      console.error('[CartSync] Error syncing local cart to backend:', err);
    }
  }

  function cartsAreEqual(cartA, cartB) {
    const equal = JSON.stringify(cartA) === JSON.stringify(cartB);
    console.log('[CartSync] Carts equal:', equal);
    return equal;
  }

  async function replaceShopifyCartWith(cart) {
    try {
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
      console.log('[CartSync] Local cart replaced with backend cart. Reloading...');
      window.location.reload();
    } catch (error) {
      console.error('[CartSync] Error replacing cart:', error);
    }
  }

  async function initialSync() {
    console.log('[CartSync] Initial sync started.');
    customerId = getCustomerId();
    if (!customerId) {
      console.log('[CartSync] No customer ID, skipping sync.');
      return;
    }
    const [localCart, backendCart] = await Promise.all([
      getLocalCart(),
      fetchBackendCart()
    ]);
    if (backendCart && !cartsAreEqual(localCart, backendCart)) {
      console.log('[CartSync] Backend cart is different. Replacing local cart...');
      await replaceShopifyCartWith(backendCart);
    } else {
      console.log('[CartSync] No cart replacement needed.');
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
        }, 100);
        console.log('[CartSync] Cart update event detected, syncing to backend...');
      }
      return originalFetch.apply(this, args);
    };

    const originalOpen = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this.addEventListener('load', function() {
        if (url && url.match(/\/cart\/(add|update|change|clear)(\.js)?/)) {
          setTimeout(async () => {
            const cart = await getLocalCart();
            await syncLocalCartToBackend(cart);
          }, 100);
          console.log('[CartSync] Cart update event detected (XHR), syncing to backend...');
        }
      });
      return originalOpen.call(this, method, url, ...rest);
    };
  }

  // --- INIT ---
  const onLoad = () => {
    console.log('[CartSync] Script loaded.');
    initialSync();
    interceptCartRequests();
  }

  if (document.readyState === "complete") {
    onLoad();
  } else {
    window.addEventListener("load", onLoad);
  }
})();
