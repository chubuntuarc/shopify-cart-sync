// npx terser scripts/cart-sync.js -o public/scripts/cart-sync.min.js --compress --mangle

(function() {
  const appURL = "https://arco-henna.vercel.app";
  let customerId = null;
  let firstSyncDone = false;

function getCustomerId() {
  return typeof window !== 'undefined' && window.CUSTOMER_ID ? String(window.CUSTOMER_ID) : null;
}

function setUserIdCookie(customerId) {
  if (customerId) {
    document.cookie = `user_id=${customerId}; path=/; SameSite=Lax`;
  } else {
    document.cookie = 'user_id=; Max-Age=0; path=/; SameSite=Lax';
  }
}

function syncUserIdCookie() {
  customerId = getCustomerId();
  setUserIdCookie(customerId);
}

syncUserIdCookie();

function getSessionToken() {
  const match = document.cookie.match(/(?:^|;\s*)persistent_cart_session=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isUserLoggedIn() {
  return !!getSessionToken();
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
  } catch (err) {
    console.error('Error fetching Shopify AJAX cart:', err);
  }
  return null;
}

function setLocalCart(cart) {
  if (cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
  }
}
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

function cartsAreEqual(cartA, cartB) {
  return JSON.stringify(cartA) === JSON.stringify(cartB);
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

  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px);}
      to { opacity: 1; transform: translateY(0);}
    }
    .cart-loaded-popup-backdrop { animation: fadeIn 0.3s; }
  `;
  document.head.appendChild(style);

  popup.querySelector('#cart-reload-btn').onclick = () => window.location.href = '/cart';

  backdrop.appendChild(popup);
  document.body.appendChild(backdrop);
};

async function syncCart() {
  console.log("syncCart");
  customerId = getCustomerId();
  console.log("customerId", customerId);
  if (!customerId) return;

  const localCart = await getLocalCart();
  console.log("localCart", localCart);
  const backendCart = await fetchBackendCart();
  console.log("backendCart", backendCart);
  console.log("firstSyncDone", firstSyncDone);
  if (!firstSyncDone) {
    console.log("First sync");
    if (backendCart && backendCart.items && backendCart.items.length > 0 && (!localCart || !cartsAreEqual(localCart, backendCart))) {
      console.log("Replacing Shopify cart with backend cart");
      await replaceShopifyCartWith(backendCart);
      setLocalCart(backendCart);
      firstSyncDone = true;
      return;
    }
    if (!backendCart && localCart && localCart.items && localCart.items.length > 0) {
      console.log("Syncing local cart to backend");
      await syncLocalCartToBackend(localCart);
      firstSyncDone = true;
      return;
    }
    firstSyncDone = true;
    return;
  } else {
    console.log("Not first sync");
    if (localCart && backendCart && cartsAreEqual(localCart, backendCart)) {
      console.log("Local and backend cart are equal");
      return;
    }

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

    if (backendCart && (!localCart || !cartsAreEqual(localCart, backendCart))) {
      console.log("Updating local cart with backend cart");
      setLocalCart(backendCart);
      return;
    }
  }
}

function interceptCartRequests() {
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    let url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url && url.match(/\/cart\/(add|update|change|clear)(\.js)?/) && firstSyncDone) {
      setTimeout(() => {
        syncCart();
      }, 500);
    }
    return originalFetch.apply(this, args);
  };

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
  }, 2000);
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

customerId = getCustomerId();
if (customerId) {
  updateSessionWithUserId(customerId);
}

console.log("Script loaded");
interceptCartRequests();
syncCart();
observeCartChanges();

async function replaceShopifyCartWith(cart) {
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
    cartLoadedPopup();
  }

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
