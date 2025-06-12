// npx terser scripts/cart-sync.js -o public/scripts/cart-sync.min.js --compress --mangle

(function() {
  const appURL = "https://arco-henna.vercel.app";
  let customerId = null;
  let firstSyncDone = false;
  let lastSyncTime = 0;
  const SYNC_COOLDOWN = 1000; // 1 segundo de cooldown entre sincronizaciones
  let syncInProgress = false;

  console.log('🔄 Cart Sync Script Initialized');

function getCustomerId() {
  const id = typeof window !== 'undefined' && window.CUSTOMER_ID ? String(window.CUSTOMER_ID) : null;
  console.log('👤 Customer ID:', id);
  return id;
}

function setUserIdCookie(customerId) {
  if (customerId) {
    document.cookie = `user_id=${customerId}; path=/; SameSite=Lax`;
    console.log('🍪 User ID cookie set:', customerId);
  } else {
    document.cookie = 'user_id=; Max-Age=0; path=/; SameSite=Lax';
    console.log('🍪 User ID cookie cleared');
  }
}

function syncUserIdCookie() {
  customerId = getCustomerId();
  setUserIdCookie(customerId);
}

syncUserIdCookie();

function getSessionToken() {
  const match = document.cookie.match(/(?:^|;\s*)persistent_cart_session=([^;]*)/);
  const token = match ? decodeURIComponent(match[1]) : null;
  console.log('🔑 Session Token:', token ? 'Present' : 'Not found');
  return token;
}

function isUserLoggedIn() {
  const loggedIn = !!getSessionToken();
  console.log('👤 User logged in:', loggedIn);
  return loggedIn;
}

async function getLocalCart() {
  try {
    console.log('🛒 Fetching local cart...');
    const response = await fetch('/cart.js', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      const cart = await response.json();
      console.log('🛒 Local cart fetched:', cart);
      return cart;
    }
  } catch (err) {
    console.error('❌ Error fetching Shopify AJAX cart:', err);
  }
  return null;
}

function setLocalCart(cart, callback = null) {
  if (cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    console.log('💾 Local cart saved to localStorage');
    if (callback) {
      callback();
    }
  }
}

async function fetchBackendCart() {
  if (!customerId) {
    console.log('⚠️ No customer ID, skipping backend cart fetch');
    return null;
  }
  try {
    console.log('🔄 Fetching backend cart...');
    const response = await fetch(`${appURL}/api/cart?userId=${encodeURIComponent(customerId)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (response.ok) {
      const data = await response.json();
      console.log('🔄 Backend cart fetched:', data.cart);
      return data.cart || null;
    }
  } catch (err) {
    console.error('❌ Error fetching backend cart:', err);
  }
  return null;
}

async function syncLocalCartToBackend(cart) {
  if (!customerId) {
    console.log('⚠️ No customer ID, skipping backend sync');
    return null;
  }
  try {
    console.log('🔄 Syncing local cart to backend...');
    const response = await fetch(appURL + '/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: customerId,
        cartData: cart || {}
      }),
    });
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Local cart synced to backend:', data.cart);
      return data.cart || null;
    }
  } catch (err) {
    console.error('❌ Error syncing local cart to backend:', err);
  }
  return null;
}

function cartsAreEqual(cartA, cartB) {
  const equal = JSON.stringify(cartA) === JSON.stringify(cartB);
  console.log('🔄 Carts equal:', equal);
  return equal;
}

const cartLoadedPopup = () => {
  const existing = document.querySelector('.cart-loaded-popup-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'cart-loaded-popup-backdrop';
  backdrop.style.cssText = `
    position: fixed; z-index: 9999; inset: 0; pointer-events: none;
  `;

  const popup = document.createElement('div');
  popup.className = 'cart-loaded-popup';
  popup.style.cssText = `
    position: fixed;
    top: 2rem;
    right: 2rem;
    min-width: 220px;
    max-width: 300px;
    background: rgba(255,255,255,0.5);
    border-radius: 14px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.13);
    padding: 1.2rem 1.2rem 1rem 1.2rem;
    text-align: left;
    backdrop-filter: blur(5px);
    animation: fadeIn 0.4s;
    pointer-events: auto;
    font-family: inherit;
  `;

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.style.cssText = `
    position: absolute;
    top: 0.5rem;
    right: 0.7rem;
    background: transparent;
    border: none;
    color: #888;
    font-size: 1.3rem;
    font-weight: bold;
    cursor: pointer;
    z-index: 2;
    padding: 0;
    line-height: 1;
    transition: color 0.2s;
  `;
  closeBtn.onmouseenter = () => closeBtn.style.color = '#222';
  closeBtn.onmouseleave = () => closeBtn.style.color = '#888';
  closeBtn.onclick = () => {
    backdrop.remove();
    popup.remove();
  };

  popup.appendChild(closeBtn);

  popup.innerHTML += `
    <h1 style="font-size: 1rem; margin: 0 0 0.3rem 0; color: #222;">🛒 Don't miss your cart!</h1>
    <p style="color: #444; margin: 0 0 1rem 0; font-size: 0.8rem;">You have an active cart in your account.</p>
    <button id="cart-reload-btn" style="
      background: linear-gradient(90deg, #6366f1 0%, #60a5fa 100%);
      color: #fff;
      border: none;
      border-radius: 7px;
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(99,102,241,0.10);
      transition: background 0.2s, transform 0.1s;
      margin-top: 0.2rem;
      display: block;
      width: 100%;
    ">Show cart</button>
  `;

  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px);}
      to { opacity: 1; transform: translateY(0);}
    }
    .cart-loaded-popup-backdrop { animation: fadeIn 0.3s; }
  `;
  document.head.appendChild(style);

  if (window.location.pathname === '/cart') {
    popup.querySelector('#cart-reload-btn').onclick = () => window.location.reload();
  } else {
    popup.querySelector('#cart-reload-btn').onclick = () => window.location.href = '/cart';
  }

  backdrop.appendChild(popup);
  document.body.appendChild(backdrop);
};

async function syncCart() {
  const now = Date.now();
  if (syncInProgress || (now - lastSyncTime < SYNC_COOLDOWN)) {
    console.log('⏳ Sync skipped - too soon or in progress');
    return;
  }

  console.log('🔄 Starting cart sync...');
  syncInProgress = true;
  lastSyncTime = now;

  try {
    customerId = getCustomerId();
    if (!customerId) {
      console.log('⚠️ No customer ID, skipping sync');
      return;
    }

    // Obtener ambos carritos en paralelo para mayor velocidad
    const [localCart, backendCart] = await Promise.all([
      getLocalCart(),
      fetchBackendCart()
    ]);

    console.log('📊 Sync State:', {
      hasLocalCart: !!localCart,
      hasBackendCart: !!backendCart,
      firstSyncDone
    });

    if (!firstSyncDone) {
      console.log('🔄 First sync attempt...');
      if (backendCart?.items?.length > 0 && (!localCart || !cartsAreEqual(localCart, backendCart))) {
        console.log('🔄 Replacing local cart with backend cart...');
        await replaceShopifyCartWith(backendCart);
        setLocalCart(backendCart);
        firstSyncDone = true;
        console.log("✅ Cart Loaded ⚡️");
        return;
      }
      if (!backendCart && localCart?.items?.length > 0) {
        console.log('🔄 Syncing local cart to backend...');
        await syncLocalCartToBackend(localCart);
        firstSyncDone = true;
        return;
      }
      firstSyncDone = true;
      return;
    }

    // Lógica de sincronización mejorada
    if (localCart && backendCart) {
      if (cartsAreEqual(localCart, backendCart)) {
        console.log('🔄 Carts are in sync, no action needed');
        return;
      }

      // Determinar cuál carrito es más reciente
      const localCartTime = localCart.updated_at || 0;
      const backendCartTime = backendCart.updated_at || 0;

      if (localCartTime > backendCartTime) {
        console.log('🔄 Local cart is newer, syncing to backend...');
        await syncLocalCartToBackend(localCart);
      } else {
        console.log('🔄 Backend cart is newer, updating local...');
        await replaceShopifyCartWith(backendCart);
        setLocalCart(backendCart);
      }
    } else if (localCart?.items?.length > 0) {
      console.log('🔄 Syncing local cart to backend...');
      await syncLocalCartToBackend(localCart);
    } else if (backendCart?.items?.length > 0) {
      console.log('🔄 Updating local cart with backend data...');
      await replaceShopifyCartWith(backendCart);
      setLocalCart(backendCart);
    }
  } catch (error) {
    console.error('❌ Error during sync:', error);
  } finally {
    syncInProgress = false;
  }
}

function interceptCartRequests() {
  console.log('🔄 Setting up cart request interception...');
  
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    let url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url && url.match(/\/cart\/(add|update|change|clear)(\.js)?/) && firstSyncDone) {
      console.log('🛒 Cart modification detected:', url);
      // Reducir el delay para una sincronización más rápida
      setTimeout(() => {
        console.log('🔄 Triggering sync after cart modification...');
        syncCart();
      }, 100); // Reducido de 500ms a 100ms
    }
    return originalFetch.apply(this, args);
  };

  const originalOpen = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.addEventListener('load', function() {
      if (url && url.match(/\/cart\/(add|update|change|clear)(\.js)?/) && firstSyncDone) {
        console.log('🛒 Cart modification detected (XHR):', url);
        setTimeout(() => {
          console.log('🔄 Triggering sync after cart modification...');
          syncCart();
        }, 100); // Reducido de 500ms a 100ms
      }
    });
    return originalOpen.call(this, method, url, ...rest);
  };
  
  console.log('✅ Cart request interception setup complete');
}

async function observeCartChanges() {
  console.log('🔄 Starting cart observation...');
  let lastCart = await getLocalCart();
  console.log('📝 Initial cart state:', lastCart);

  // Reducir el intervalo de observación
  setInterval(async () => {
    if (syncInProgress) {
      console.log('⏳ Skip observation - sync in progress');
      return;
    }

    const currentCart = await getLocalCart();
    if (
      currentCart &&
      currentCart.items &&
      currentCart.items.length > 0 &&
      !cartsAreEqual(currentCart, lastCart)
    ) {
      console.log('🔄 Cart change detected in observation interval');
      console.log('📝 Previous cart:', lastCart);
      console.log('📝 Current cart:', currentCart);
      
      lastCart = currentCart;
      if (isUserLoggedIn()) {
        console.log('🔄 Syncing observed cart changes to backend...');
        await syncLocalCartToBackend(currentCart);
      } else {
        console.log('⚠️ User not logged in, skipping backend sync');
      }
    }
  }, 1000); // Reducido de 2000ms a 1000ms
  
  console.log('✅ Cart observation started');
}

function updateSessionWithUserId(customerId) {
  if (!customerId) {
    console.log('⚠️ No customer ID provided for session update');
    return;
  }
  
  console.log('🔄 Updating session with user ID:', customerId);
  fetch(appURL + '/api/session/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: customerId }),
  }).then(res => {
    if (res.ok) {
      console.log('✅ Session updated successfully');
    } else {
      console.error('❌ Failed to update session:', res.status);
    }
  }).catch(err => {
    console.error('❌ Error updating session:', err);
  });
}

customerId = getCustomerId();
if (customerId) {
  updateSessionWithUserId(customerId);
}

console.log("🏹 Arco - Cart Sync Initialized");
interceptCartRequests();
syncCart();
observeCartChanges();

async function replaceShopifyCartWith(cart) {
  console.log('🔄 Replacing Shopify cart...');
  await fetch('/cart/clear.js', { method: 'POST', credentials: 'include' });
  console.log('✅ Cart cleared');

  if (cart && cart.items && cart.items.length > 0) {
    console.log('🛒 Adding items to cart:', cart.items);
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
    console.log('✅ Items added to cart');
  }

  await waitForShopifyCartToMatch(cart);
}

async function waitForShopifyCartToMatch(targetCart, maxTries = 10, delay = 300) {
  console.log('⏳ Waiting for Shopify cart to match...');
  for (let i = 0; i < maxTries; i++) {
    const currentCart = await getLocalCart();
    if (cartsAreEqual(currentCart, targetCart)) {
      console.log('✅ Cart matched successfully');
      return;
    }
    console.log(`⏳ Attempt ${i + 1}/${maxTries}: Cart not matched yet`);
    await new Promise(res => setTimeout(res, delay));
  }
  console.warn('⚠️ Shopify cart did not match backend cart after waiting');
}

})();
