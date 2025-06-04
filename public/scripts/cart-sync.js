(function() {
  const appURL = "https://arco-henna.vercel.app";
  let customerId = null;
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
function getLocalCart() {
  const cart = localStorage.getItem('cart');
  try {
    return cart ? JSON.parse(cart) : null;
  } catch {
    return null;
  }
}

// 7. Guardar el carrito en localStorage
function setLocalCart(cart) {
  if (cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
  }
}

// Obtener el userId desde la cookie
function getUserIdFromCookie() {
  const match = document.cookie.match(/(?:^|;\s*)user_id=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// 8. Obtener el carrito persistente del backend
async function fetchBackendCart() {
  if (!customerId) return null;
  try {
    const response = await fetch(appURL + "/api/cart", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        userId: customerId,
        cartData: {} // Para compatibilidad, aunque no se use en GET/POST de consulta
      }),
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
      credentials: 'include',
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

// 11. Lógica principal de sincronización
async function syncCart() {
  customerId = getCustomerId();
  if (!customerId) return;

  const localCart = getLocalCart();
  const backendCart = await fetchBackendCart();

  // Si ambos existen y son iguales, no hacer nada
  if (localCart && backendCart && cartsAreEqual(localCart, backendCart)) {
    return;
  }

  // Si el local existe y el backend no, o el local es diferente, subir el local
  if (localCart && (!backendCart || !cartsAreEqual(localCart, backendCart))) {
    const syncedCart = await syncLocalCartToBackend(localCart);
    if (syncedCart) setLocalCart(syncedCart);
    return;
  }

  // Si el backend existe y el local no, o el backend es diferente, actualizar el local
  if (backendCart && (!localCart || !cartsAreEqual(localCart, backendCart))) {
    setLocalCart(backendCart);
    return;
  }
}

// 12. Detectar cambios en el carrito interceptando fetch/XMLHttpRequest
function interceptCartRequests() {
  // Interceptar fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    let url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url && url.match(/\/cart\/(add|update|change|clear)(\.js)?/)) {
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
      if (url && url.match(/\/cart\/(add|update|change|clear)(\.js)?/)) {
        setTimeout(() => {
          syncCart();
        }, 500);
      }
    });
    return originalOpen.call(this, method, url, ...rest);
  };
}

// 13. Sincronizar cada vez que el carrito local cambie (opcional, por si hay cambios fuera de Shopify)
function observeCartChanges() {
  let lastCart = getLocalCart();

  setInterval(() => {
    const currentCart = getLocalCart();
    if (!cartsAreEqual(currentCart, lastCart)) {
      lastCart = currentCart;
      // Solo sincroniza si el usuario tiene sesión
      if (isUserLoggedIn()) {
        syncLocalCartToBackend(currentCart);
      }
    }
  }, 2000); // Chequea cada 2 segundos (ajusta el intervalo si lo deseas)
}

function updateSessionWithUserId(customerId) {
  if (!customerId) return;
  fetch(appURL + '/api/session/update', {
    method: 'POST',
    credentials: 'include',
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

})();
