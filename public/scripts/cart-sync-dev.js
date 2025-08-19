// npx terser scripts/cart-sync.js -o public/scripts/cart-sync.min.js --compress --mangle

(function () {
  const appURL = "https://19f558298788.ngrok-free.app";
  let customerId = null;
  let cartSyncInterval = null;
  let lastSyncTime = 0;
  let isReloading = false;
  let reloadAttempts = 0;
  const MAX_RELOAD_ATTEMPTS = 3;

  // Obtener configuraciones
  function getConfig() {
    const config = window.CART_SYNC_CONFIG || {};
    return {
      enable_sync: config.enable_sync !== false, // default true
      sync_frequency: config.sync_frequency || "fast",
    };
  }

  // Usar la frecuencia configurada
  function getSyncInterval() {
    const config = getConfig();
    switch (config.sync_frequency) {
      case "slow":
        return 10000; // 10 segundos
      case "normal":
        return 5000; // 5 segundos
      case "fast":
      default:
        return 3000; // 3 segundos
    }
  }

  // Verificar si está habilitado
  function isSyncEnabled() {
    const config = getConfig();
    return config.enable_sync;
  }

  function getCustomerId() {
    const id =
      typeof window !== "undefined" && window.CUSTOMER_ID
        ? String(window.CUSTOMER_ID)
        : null;
    return id;
  }

  function updateCustomerId() {
    const newCustomerId = getCustomerId();
    if (newCustomerId && newCustomerId !== customerId) {
      customerId = newCustomerId;
    }
    return customerId;
  }

  async function getLocalCart() {
    try {
      const response = await fetch("/cart.js", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.error("[CartSync] Error fetching local cart:", err);
    }
    return null;
  }

  async function fetchBackendCart() {
    updateCustomerId();
    if (!customerId) return null;

    try {
      const response = await fetch(
        `${appURL}/api/cart?userId=${encodeURIComponent(customerId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );
      if (response.ok) {
        const data = await response.json();
        return data.cart || null;
      }
    } catch (err) {
      console.error("[CartSync] Error fetching backend cart:", err);
    }
    return null;
  }

  async function syncLocalCartToBackend(cart) {
    updateCustomerId();
    if (!customerId) return null;

    console.log('[CartSync][DEBUG] syncLocalCartToBackend - localCart:', cart);

    try {
      const response = await fetch(appURL + "/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: customerId,
          cartData: cart || {},
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("[CartSync] Local cart synced to backend");
        console.log('[CartSync][DEBUG] Backend response after syncLocalCartToBackend:', result);
        lastSyncTime = Date.now();
        startRealtimeCartSync();
        return result;
      } else {
        console.error(
          "[CartSync] Failed to sync cart to backend. Status:",
          response.status
        );
      }
    } catch (err) {
      console.error("[CartSync] Error syncing cart to backend:", err);
    }
    return null;
  }

  function cartsAreEqual(cartA, cartB) {
    if (!cartA && !cartB) return true;
    if (!cartA || !cartB) return false;

    const localItemCount = cartA.items?.length || 0;
    const backendItemCount = cartB.items?.length || 0;

    if (localItemCount !== backendItemCount) {
      console.log(
        "[CartSync] Item count mismatch:",
        localItemCount,
        "vs",
        backendItemCount
      );
      return false;
    }

    if (localItemCount === 0) return true;

    // Comparar precios totales
    const localPrice = cartA.total_price
      ? Math.round((cartA.total_price / 100) * 100) / 100
      : 0;
    const backendPrice = cartB.totalPrice
      ? Math.round(cartB.totalPrice * 100) / 100
      : 0;

    if (Math.abs(localPrice - backendPrice) > 0.01) {
      console.log("[CartSync] Price mismatch:", localPrice, "vs", backendPrice);
      return false;
    }

    const localItems = cartA.items || [];
    const backendItems = cartB.items || [];

    if (localItems.length !== backendItems.length) return false;

    // Crear mapas para comparación rápida
    const localItemMap = new Map();
    const backendItemMap = new Map();

    localItems.forEach((item) => {
      const key = String(item.variant_id || item.id);
      localItemMap.set(key, item.quantity);
    });

    backendItems.forEach((item) => {
      const key = String(
        item.shopifyVariantId || item.variantId || item.variant_id
      );
      backendItemMap.set(key, item.quantity);
    });

    // Comparar items
    for (const [key, localQty] of localItemMap) {
      const backendQty = backendItemMap.get(key);
      if (backendQty === undefined || localQty !== backendQty) {
        console.log(
          "[CartSync] Item mismatch for key:",
          key,
          "local:",
          localQty,
          "backend:",
          backendQty
        );
        return false;
      }
    }

    // Verificar items del backend
    for (const [key, backendQty] of backendItemMap) {
      const localQty = localItemMap.get(key);
      if (localQty === undefined || localQty !== backendQty) {
        console.log(
          "[CartSync] Backend item not found in local for key:",
          key,
          "backend:",
          backendQty,
          "local:",
          localQty
        );
        return false;
      }
    }

    return true;
  }

  async function replaceShopifyCartWith(cart) {
    if (isReloading) {
      console.log("[CartSync] Already reloading, skipping duplicate reload");
      return;
    }

    if (reloadAttempts >= MAX_RELOAD_ATTEMPTS) {
      console.log(
        "[CartSync] Maximum reload attempts reached, stopping sync to prevent infinite loop"
      );
      return;
    }

    // Evita reload si ambos carritos están vacíos
    const backendHasItems = cart && cart.items && cart.items.length > 0;
    const localCart = await getLocalCart();
    const localHasItems = localCart && localCart.items && localCart.items.length > 0;
    console.log('[CartSync][DEBUG] replaceShopifyCartWith - backendCart:', cart);
    console.log('[CartSync][DEBUG] replaceShopifyCartWith - localCart:', localCart);
    if (!backendHasItems && !localHasItems) {
      console.log('[CartSync] Both carts are empty, not reloading');
      return;
    }

    try {
      console.log(
        "[CartSync] Replacing local cart with backend cart (attempt",
        reloadAttempts + 1,
        "of",
        MAX_RELOAD_ATTEMPTS,
        ")"
      );
      isReloading = true;
      reloadAttempts++;
      localStorage.setItem("cart_sync_reloaded", "1");
      localStorage.setItem("cart_sync_timestamp", Date.now().toString());
      localStorage.setItem("cart_sync_attempts", reloadAttempts.toString());

      await fetch("/cart/clear.js", { method: "POST", credentials: "include" });
      if (backendHasItems) {
        const items = cart.items.map((item) => ({
          id: item.shopifyVariantId,
          quantity: item.quantity,
          properties: item.properties || undefined,
        }));
        await fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ items }),
        });
        console.log('[CartSync][DEBUG] replaceShopifyCartWith - items added to local cart:', items);
      }
      window.location.reload();
    } catch (error) {
      console.error("[CartSync] Error replacing cart:", error);
      isReloading = false;
      reloadAttempts--;
    }
  }

  async function initialSync() {
    if (localStorage.getItem("cart_sync_reloaded")) {
      localStorage.removeItem("cart_sync_reloaded");

      const attemptsStr = localStorage.getItem("cart_sync_attempts");
      if (attemptsStr) {
        reloadAttempts = parseInt(attemptsStr);
        localStorage.removeItem("cart_sync_attempts");
      }

      const timestamp = localStorage.getItem("cart_sync_timestamp");
      if (timestamp) {
        lastSyncTime = parseInt(timestamp);
        localStorage.removeItem("cart_sync_timestamp");
      }

      updateCustomerId();
      if (customerId) {
        const [localCart, backendCart] = await Promise.all([
          getLocalCart(),
          fetchBackendCart(),
        ]);

        if (!cartsAreEqual(localCart, backendCart)) {
          console.log(
            "[CartSync] Carts still different after reload, syncing again..."
          );
          if (
            backendCart &&
            backendCart.items &&
            backendCart.items.length > 0
          ) {
            await replaceShopifyCartWith(backendCart);
          } else if (
            localCart &&
            localCart.items &&
            localCart.items.length > 0
          ) {
            await syncLocalCartToBackend(localCart);
          }
        } else {
          console.log("[CartSync] Carts synchronized after reload");
          reloadAttempts = 0;
        }
      }
      return;
    }

    updateCustomerId();
    if (!customerId) {
      console.log("[CartSync] No customer ID found, skipping sync");
      return;
    }

    console.log("[CartSync] Starting initial sync for customer:", customerId);
    const [localCart, backendCart] = await Promise.all([
      getLocalCart(),
      fetchBackendCart(),
    ]);

    const localHasItems =
      localCart && localCart.items && localCart.items.length > 0;
    const backendHasItems =
      backendCart && backendCart.items && backendCart.items.length > 0;

    if (!localHasItems && !backendHasItems) {
      return;
    }

    if (localHasItems && !backendHasItems) {
      console.log("[CartSync] Syncing local cart to backend");
      await syncLocalCartToBackend(localCart);
      return;
    }

    if (!localHasItems && backendHasItems) {
      console.log("[CartSync] Replacing local cart with backend cart");
      await replaceShopifyCartWith(backendCart);
      return;
    }

    if (cartsAreEqual(localCart, backendCart)) {
      console.log("[CartSync] Carts are synchronized");
      return;
    } else {
      console.log("[CartSync] Carts are different, replacing local cart");
      await replaceShopifyCartWith(backendCart);
      return;
    }
  }

  function interceptCartRequests() {
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      let url = typeof args[0] === "string" ? args[0] : args[0]?.url;

      if (url && url.match(/\/cart\/(add|update|change|clear)(\.js)?/)) {
        if (cartSyncInterval) {
          clearInterval(cartSyncInterval);
        }

        setTimeout(async () => {
          const cart = await getLocalCart();
          await syncLocalCartToBackend(cart);
        }, 1000);
      }
      return originalFetch.apply(this, args);
    };

    const originalOpen = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this.addEventListener("load", function () {
        if (url && url.match(/\/cart\/(add|update|change|clear)(\.js)?/)) {
          if (cartSyncInterval) {
            clearInterval(cartSyncInterval);
          }

          setTimeout(async () => {
            const cart = await getLocalCart();
            await syncLocalCartToBackend(cart);
          }, 1000);
        }
      });
      return originalOpen.call(this, method, url, ...rest);
    };

    if (typeof window.Shopify !== "undefined" && window.Shopify.onCartUpdate) {
      window.Shopify.onCartUpdate = function (cart) {
        setTimeout(async () => {
          await syncLocalCartToBackend(cart);
        }, 500);
      };
    }

    document.addEventListener("cart:updated", function (event) {
      setTimeout(async () => {
        const cart = await getLocalCart();
        await syncLocalCartToBackend(cart);
      }, 500);
    });
  }

  function startRealtimeCartSync() {
    // Verificar si la sincronización está habilitada
    if (!isSyncEnabled()) {
      console.log("[CartSync] Cart synchronization is disabled in settings");
      return;
    }

    const COOLDOWN_TIME = 10000; // 10 segundos de cooldown
    const timeSinceLastSync = Date.now() - lastSyncTime;
    const initialDelay =
      timeSinceLastSync < COOLDOWN_TIME
        ? COOLDOWN_TIME - timeSinceLastSync
        : 2000;

    setTimeout(() => {
      const syncInterval = getSyncInterval();
      console.log(
        "[CartSync] Starting realtime sync with interval:",
        syncInterval,
        "ms"
      );

      cartSyncInterval = setInterval(async () => {
        if (document.visibilityState !== "visible") return;
        if (isReloading) return;

        const timeSinceLastSync = Date.now() - lastSyncTime;
        if (timeSinceLastSync < COOLDOWN_TIME) {
          return;
        }

        if (reloadAttempts >= MAX_RELOAD_ATTEMPTS) {
          console.log(
            "[CartSync] Maximum reload attempts reached, stopping polling to prevent infinite loop"
          );
          clearInterval(cartSyncInterval);
          return;
        }

        updateCustomerId();
        if (!customerId) return;

        const [localCart, backendCart] = await Promise.all([
          getLocalCart(),
          fetchBackendCart(),
        ]);

        if (!cartsAreEqual(localCart, backendCart)) {
          console.log(
            "[CartSync] Cart difference detected, updating local cart"
          );
          await replaceShopifyCartWith(backendCart);
          clearInterval(cartSyncInterval);
        }
      }, syncInterval);
    }, initialDelay);
  }

  const onLoad = () => {
    // Verificar si la sincronización está habilitada
    if (!isSyncEnabled()) {
      console.log(
        "[CartSync] Cart synchronization is disabled in app block settings"
      );
      return;
    }

    updateCustomerId();
    initialSync();
    setTimeout(interceptCartRequests, 1000);
    startRealtimeCartSync();
  };

  if (document.readyState === "complete") {
    onLoad();
  } else {
    window.addEventListener("load", onLoad);
  }
})();
