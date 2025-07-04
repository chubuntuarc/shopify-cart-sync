// npx terser scripts/cart-sync.js -o public/scripts/cart-sync.min.js --compress --mangle

(function() {
  const appURL = "https://arco-henna.vercel.app";
  let customerId = null;
  let cartSyncInterval = null; // Variable global dentro del IIFE
  let lastSyncTime = 0; // Timestamp de la última sincronización
  let isReloading = false; // Flag para evitar múltiples recargas
  let reloadAttempts = 0; // Contador de intentos de recarga
  const MAX_RELOAD_ATTEMPTS = 3; // Máximo número de intentos de recarga

  function getCustomerId() {
    const id = typeof window !== 'undefined' && window.CUSTOMER_ID ? String(window.CUSTOMER_ID) : null;
    return id;
  }

  function updateCustomerId() {
    const newCustomerId = getCustomerId();
    if (newCustomerId && newCustomerId !== customerId) {
      console.log('[CartSync] Customer ID updated from', customerId, 'to', newCustomerId);
      customerId = newCustomerId;
    }
    return customerId;
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
    updateCustomerId(); // Actualizar customerId antes de hacer la petición
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
    updateCustomerId(); // Actualizar customerId antes de hacer la petición
    if (!customerId) {
      return null;
    }
    
    try {
      const response = await fetch(appURL + '/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: customerId,
          cartData: cart || {}
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('[CartSync] Local cart synced to backend');
        lastSyncTime = Date.now();
        startRealtimeCartSync();
        return result;
      } else {
        console.error('[CartSync] Failed to sync cart to backend. Status:', response.status);
      }
    } catch (err) {
      console.error('[CartSync] Error syncing cart to backend:', err);
    }
    return null;
  }

  function cartsAreEqual(cartA, cartB) {
    if (!cartA && !cartB) return true;
    if (!cartA || !cartB) return false;
    
    // Comparar número de items
    const localItemCount = cartA.items?.length || 0;
    const backendItemCount = cartB.items?.length || 0;
    
    if (localItemCount !== backendItemCount) {
      console.log('[CartSync] Item count mismatch:', localItemCount, 'vs', backendItemCount);
      return false;
    }
    
    // Si ambos están vacíos, son iguales
    if (localItemCount === 0) return true;
    
    // Comparar precios totales (convertir de centavos a unidades)
    const localPrice = cartA.total_price ? Math.round(cartA.total_price / 100 * 100) / 100 : 0;
    const backendPrice = cartB.totalPrice ? Math.round(cartB.totalPrice * 100) / 100 : 0;
    
    if (Math.abs(localPrice - backendPrice) > 0.01) {
      console.log('[CartSync] Price mismatch:', localPrice, 'vs', backendPrice);
      return false;
    }
    
    // Comparar items individuales
    const localItems = cartA.items || [];
    const backendItems = cartB.items || [];
    
    if (localItems.length !== backendItems.length) return false;
    
    // Crear mapas para comparación rápida
    const localItemMap = new Map();
    const backendItemMap = new Map();
    
    localItems.forEach(item => {
      // Convertir a string para comparación consistente
      const key = String(item.variant_id || item.id);
      localItemMap.set(key, item.quantity);
    });
    
    backendItems.forEach(item => {
      // Convertir a string para comparación consistente
      const key = String(item.shopifyVariantId || item.variantId || item.variant_id);
      backendItemMap.set(key, item.quantity);
    });
    
    // Comparar cada item del local con el backend
    for (const [key, localQty] of localItemMap) {
      const backendQty = backendItemMap.get(key);
      if (backendQty === undefined || localQty !== backendQty) {
        console.log('[CartSync] Item mismatch for key:', key, 'local:', localQty, 'backend:', backendQty);
        return false;
      }
    }
    
    // Verificar que no hay items en el backend que no estén en el local
    for (const [key, backendQty] of backendItemMap) {
      const localQty = localItemMap.get(key);
      if (localQty === undefined || localQty !== backendQty) {
        console.log('[CartSync] Backend item not found in local for key:', key, 'backend:', backendQty, 'local:', localQty);
        return false;
      }
    }
    
    return true;
  }

  async function replaceShopifyCartWith(cart) {
    if (isReloading) {
      console.log('[CartSync] Already reloading, skipping duplicate reload');
      return;
    }
    
    // Verificar si hemos excedido el número máximo de intentos
    if (reloadAttempts >= MAX_RELOAD_ATTEMPTS) {
      console.log('[CartSync] Maximum reload attempts reached, stopping sync to prevent infinite loop');
      return;
    }
    
    try {
      console.log('[CartSync] Replacing local cart with backend cart (attempt', reloadAttempts + 1, 'of', MAX_RELOAD_ATTEMPTS, ')');
      isReloading = true;
      reloadAttempts++;
      localStorage.setItem('cart_sync_reloaded', '1');
      localStorage.setItem('cart_sync_timestamp', Date.now().toString());
      localStorage.setItem('cart_sync_attempts', reloadAttempts.toString());
      
      await fetch('/cart/clear.js', { method: 'POST', credentials: 'include' });
      if (cart && cart.items && cart.items.length > 0) {
        const items = cart.items.map(item => ({
          id: item.shopifyVariantId, // Usar shopifyVariantId del backend
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
    } catch (error) {
      console.error('[CartSync] Error replacing cart:', error);
      isReloading = false;
      reloadAttempts--;
    }
  }

  async function initialSync() {
    if (localStorage.getItem('cart_sync_reloaded')) {
      localStorage.removeItem('cart_sync_reloaded');
      
      // Recuperar el contador de intentos
      const attemptsStr = localStorage.getItem('cart_sync_attempts');
      if (attemptsStr) {
        reloadAttempts = parseInt(attemptsStr);
        localStorage.removeItem('cart_sync_attempts');
      }
      
      const timestamp = localStorage.getItem('cart_sync_timestamp');
      if (timestamp) {
        lastSyncTime = parseInt(timestamp);
        localStorage.removeItem('cart_sync_timestamp');
      }
      
      // Después de una recarga, verificar que la sincronización fue exitosa
      updateCustomerId();
      if (customerId) {
        const [localCart, backendCart] = await Promise.all([
          getLocalCart(),
          fetchBackendCart()
        ]);
        
        if (!cartsAreEqual(localCart, backendCart)) {
          console.log('[CartSync] Carts still different after reload, syncing again...');
          if (backendCart && backendCart.items && backendCart.items.length > 0) {
            await replaceShopifyCartWith(backendCart);
          } else if (localCart && localCart.items && localCart.items.length > 0) {
            await syncLocalCartToBackend(localCart);
          }
        } else {
          console.log('[CartSync] Carts synchronized after reload');
          // Resetear el contador de intentos si la sincronización fue exitosa
          reloadAttempts = 0;
        }
      }
      return;
    }
    
    updateCustomerId(); // Actualizar customerId antes de hacer la sincronización inicial
    if (!customerId) {
      console.log('[CartSync] No customer ID found, skipping sync');
      return;
    }
    
    console.log('[CartSync] Starting initial sync for customer:', customerId);
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
      console.log('[CartSync] Syncing local cart to backend');
      await syncLocalCartToBackend(localCart);
      return;
    }

    if (!localHasItems && backendHasItems) {
      console.log('[CartSync] Replacing local cart with backend cart');
      await replaceShopifyCartWith(backendCart);
      return;
    }

    // Ambos tienen items
    if (cartsAreEqual(localCart, backendCart)) {
      console.log('[CartSync] Carts are synchronized');
      return;
    } else {
      console.log('[CartSync] Carts are different, replacing local cart');
      await replaceShopifyCartWith(backendCart);
      return;
    }
  }

  function interceptCartRequests() {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      let url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
      
      if (url && url.match(/\/cart\/(add|update|change|clear)(\.js)?/)) {
        if (cartSyncInterval) {
          clearInterval(cartSyncInterval);
        }
        
        // Usar un timeout más corto para sincronización más rápida
        setTimeout(async () => {
          const cart = await getLocalCart();
          await syncLocalCartToBackend(cart);
        }, 1000); // Reducido de 2s a 1s
      }
      return originalFetch.apply(this, args);
    };

    const originalOpen = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this.addEventListener('load', function() {
        if (url && url.match(/\/cart\/(add|update|change|clear)(\.js)?/)) {
          if (cartSyncInterval) {
            clearInterval(cartSyncInterval);
          }
          
          setTimeout(async () => {
            const cart = await getLocalCart();
            await syncLocalCartToBackend(cart);
          }, 1000); // Reducido de 2s a 1s
        }
      });
      return originalOpen.call(this, method, url, ...rest);
    };
    
    // También interceptar eventos de cambio del carrito si existen
    if (typeof window.Shopify !== 'undefined' && window.Shopify.onCartUpdate) {
      window.Shopify.onCartUpdate = function(cart) {
        setTimeout(async () => {
          await syncLocalCartToBackend(cart);
        }, 500); // Reducido de 1s a 0.5s
      };
    }
    
    // Interceptar eventos personalizados del carrito si existen
    document.addEventListener('cart:updated', function(event) {
      setTimeout(async () => {
        const cart = await getLocalCart();
        await syncLocalCartToBackend(cart);
      }, 500); // Reducido de 1s a 0.5s
    });
  }

  function startRealtimeCartSync() {
    // Si acabamos de recargar, esperar más tiempo antes de empezar el polling
    const timeSinceLastSync = Date.now() - lastSyncTime;
    const initialDelay = timeSinceLastSync < 10000 ? 10000 - timeSinceLastSync : 2000; // Reducido de 30s a 10s
    
    setTimeout(() => {
      cartSyncInterval = setInterval(async () => {
        if (document.visibilityState !== 'visible') return;
        if (isReloading) return; // No hacer polling si estamos recargando
        
        // Evitar polling inmediatamente después de una recarga
        const timeSinceLastSync = Date.now() - lastSyncTime;
        if (timeSinceLastSync < 10000) { // Reducido de 30s a 10s
          return;
        }
        
        // Verificar si hemos excedido el número máximo de intentos de recarga
        if (reloadAttempts >= MAX_RELOAD_ATTEMPTS) {
          console.log('[CartSync] Maximum reload attempts reached, stopping polling to prevent infinite loop');
          clearInterval(cartSyncInterval);
          return;
        }
        
        updateCustomerId(); // Actualizar customerId antes de hacer el polling
        if (!customerId) return;
        
        const [localCart, backendCart] = await Promise.all([
          getLocalCart(),
          fetchBackendCart()
        ]);
        
        if (!cartsAreEqual(localCart, backendCart)) {
          console.log('[CartSync] Cart difference detected, updating local cart');
          await replaceShopifyCartWith(backendCart);
          clearInterval(cartSyncInterval);
        }
      }, 3000); // Reducido de 5s a 3s para polling más frecuente
    }, initialDelay);
  }

  // --- INIT ---
  const onLoad = () => {
    updateCustomerId(); // Asegurar que tenemos el customerId
    initialSync();
    setTimeout(interceptCartRequests, 1000);
    startRealtimeCartSync();
  }

  if (document.readyState === "complete") {
    onLoad();
  } else {
    window.addEventListener("load", onLoad);
  }
})();
