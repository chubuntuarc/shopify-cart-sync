(function() {
  const appURL = "https://arco-henna.vercel.app";
  let customerId = null;
  let firstSyncDone = false;
// Sync cart with Shopify

// 1. Obtener el customerId desde window.CUSTOMER_ID (inyectado por Liquid)
function getCustomerId() {
  return typeof window !== 'undefined' && window.CUSTOMER_ID ? String(window.CUSTOMER_ID) : null;
}

// 2. Guardar el customerId en una cookie (si está logueado)
function setUserIdCookie(customerId) {
  if (customerId) {
    document.cookie = `user_id=${customerId}; path=/; SameSite=Lax`;
  } else {
    // Si no hay customerId, borra la cookie
    document.cookie = 'user_id=; Max-Age=0; path=/; SameSite=Lax';
  }
}

// 3. Lógica para mantener la cookie actualizada
function syncUserIdCookie() {
  customerId = getCustomerId();
  setUserIdCookie(customerId);
}

// Llama al inicio y cada vez que cambie el estado de login (opcional: puedes usar un observer)
syncUserIdCookie();

// 4. Obtener el token de sesión desde la cookie
function getSessionToken() {
  const match = document.cookie.match(/(?:^|;\s*)persistent_cart_session=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// 5. Verificar si el usuario tiene sesión activa
function isUserLoggedIn() {
  return !!getSessionToken();
}

// 6. Obtener el carrito local
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
  } catch (err) {
    console.error('Error fetching Shopify AJAX cart:', err);
  }
  return null;
}

// 7. Guardar el carrito en localStorage
function setLocalCart(cart) {
  if (cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
  }
}
// 8. Obtener el carrito persistente del backend
async function fetchBackendCart() {
  if (!customerId) return null;
  try {
    const response = await fetch(`${appURL}/api/cart?userId=${encodeURIComponent(customerId)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (response.ok) {
      const data = await response.json();
      return data.cart || null;
    }
  } catch (err) {
    console.error('Error fetching backend cart:', err);
  }
  return null;
}

// 9. Subir el carrito local al backend
async function syncLocalCartToBackend(cart) {
  if (!customerId) return null;
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
      const data = await response.json();
      return data.cart || null;
    }
  } catch (err) {
    console.error('Error syncing local cart to backend:', err);
  }
  return null;
}

// 10. Comparar carritos
function cartsAreEqual(cartA, cartB) {
  return JSON.stringify(cartA) === JSON.stringify(cartB);
}

const cartLoadedPopup = () => {
  // Remove any existing popup
  const existing = document.querySelector('.cart-loaded-popup-backdrop');
  if (existing) existing.remove();

  // Create backdrop (transparent, only for z-index stacking)
  const backdrop = document.createElement('div');
  backdrop.className = 'cart-loaded-popup-backdrop';
  backdrop.style.cssText = `
    position: fixed; z-index: 9999; inset: 0; pointer-events: none;
  `;

  // Create popup
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

  // Add close button
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
  closeBtn.onclick = () => backdrop.remove();

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
    ">Go to cart</button>
  `;

  // Add fade-in keyframes
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px);}
      to { opacity: 1; transform: translateY(0);}
    }
    .cart-loaded-popup-backdrop { animation: fadeIn 0.3s; }
  `;
  document.head.appendChild(style);

  // Button event
  popup.querySelector('#cart-reload-btn').onclick = () => window.location.href = '/cart';

  // Append
  backdrop.appendChild(popup);
  document.body.appendChild(backdrop);
};

// 11. Lógica principal de sincronización
async function syncCart() {
  console.log("syncCart");
  customerId = getCustomerId();
  console.log("customerId", customerId);
  if (!customerId) return;

  const localCart = await getLocalCart();
  console.log("localCart", localCart);
  const backendCart = await fetchBackendCart();
  console.log("backendCart", backendCart);
  // --- PRIMERA CARGA ---
  console.log("firstSyncDone", firstSyncDone);
  if (!firstSyncDone) {
    console.log("First sync");
    if (backendCart && backendCart.items && backendCart.items.length > 0 && (!localCart || !cartsAreEqual(localCart, backendCart))) {
      console.log("Replacing Shopify cart with backend cart");
      await replaceShopifyCartWith(backendCart);
      setLocalCart(backendCart);
      firstSyncDone = true;
      cartLoadedPopup();
      return;
    }
    if (!backendCart && localCart && localCart.items && localCart.items.length > 0) {
      console.log("Syncing local cart to backend");
      await syncLocalCartToBackend(localCart);
      firstSyncDone = true;
      return;
    }
    // Si ambos están vacíos, no hacer nada
    firstSyncDone = true;
    return;
  } else {
    console.log("Not first sync");
    // --- Lógica normal después de la primera carga ---
    if (localCart && backendCart && cartsAreEqual(localCart, backendCart)) {
      console.log("Local and backend cart are equal");
      return;
    }

    // Si el local cambió, sube al backend SOLO si tiene items
    if (
      localCart &&
      localCart.items &&
      localCart.items.length > 0 &&
      (!backendCart || !cartsAreEqual(localCart, backendCart))
    ) {
      const syncedCart = await syncLocalCartToBackend(localCart);
      console.log(
        "Synced cart,  Si el local cambió, sube al backend SOLO si tiene items"
      );
      if (syncedCart) setLocalCart(syncedCart);
      return;
    }

    // Si el backend cambió (raro después de la primera carga), actualiza el local
    if (backendCart && (!localCart || !cartsAreEqual(localCart, backendCart))) {
      console.log("Updating local cart with backend cart");
      setLocalCart(backendCart);
      return;
    }
  }
}

// 12. Detectar cambios en el carrito interceptando fetch/XMLHttpRequest
function interceptCartRequests() {
  // Interceptar fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    let url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url && url.match(/\/cart\/(add|update|change|clear)(\.js)?/) && firstSyncDone) {
      setTimeout(() => {
        // Espera a que el carrito se actualice en Shopify antes de sincronizar
        syncCart();
      }, 500);
    }
    return originalFetch.apply(this, args);
  };

  // Interceptar XMLHttpRequest
  const originalOpen = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.addEventListener('load', function() {
      if (url && url.match(/\/cart\/(add|update|change|clear)(\.js)?/) && firstSyncDone) {
        setTimeout(() => {
          syncCart();
        }, 500);
      }
    });
    return originalOpen.call(this, method, url, ...rest);
  };
}

// 13. Sincronizar cada vez que el carrito local cambie (opcional, por si hay cambios fuera de Shopify)
async function observeCartChanges() {
  let lastCart = await getLocalCart();

  setInterval(async () => {
    const currentCart = await getLocalCart();
    if (
      currentCart &&
      currentCart.items &&
      currentCart.items.length > 0 &&
      !cartsAreEqual(currentCart, lastCart)
    ) {
      lastCart = currentCart;
      if (isUserLoggedIn()) {
        await syncLocalCartToBackend(currentCart);
      }
    }
  }, 2000); // Chequea cada 2 segundos (ajusta el intervalo si lo deseas)
}

function updateSessionWithUserId(customerId) {
  if (!customerId) return;
  fetch(appURL + '/api/session/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: customerId }),
  }).then(res => {
    if (res.ok) {
      console.log('Session updated with userId:', customerId);
    }
  }).catch(err => {
    console.error('Error updating session with userId:', err);
  });
}

// Llama a esta función cuando detectes o cambie el CUSTOMER_ID
customerId = getCustomerId();
if (customerId) {
  updateSessionWithUserId(customerId);
}

console.log("Script loaded");
interceptCartRequests();
syncCart();
observeCartChanges();

async function replaceShopifyCartWith(cart) {
  // 1. Clear the cart
  await fetch('/cart/clear.js', { method: 'POST', credentials: 'include' });

  // 2. Add all items from backend cart
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

  // 3. Espera a que el carrito de Shopify refleje los cambios
  await waitForShopifyCartToMatch(cart);
}

async function waitForShopifyCartToMatch(targetCart, maxTries = 10, delay = 300) {
  for (let i = 0; i < maxTries; i++) {
    const currentCart = await getLocalCart();
    if (cartsAreEqual(currentCart, targetCart)) {
      return;
    }
    await new Promise(res => setTimeout(res, delay));
  }
  console.warn('Shopify cart did not match backend cart after waiting.');
}

})();
