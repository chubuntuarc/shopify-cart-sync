console.log('cart-sync.js loaded');

(function() {
// Sync cart with Shopify

// 1. Obtener el token de sesión desde la cookie
function getSessionToken() {
  const match = document.cookie.match(/(?:^|;\s*)persistent_cart_session=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// 2. Verificar si el usuario tiene sesión activa
function isUserLoggedIn() {
  return !!getSessionToken();
}

// 3. Obtener el carrito local
function getLocalCart() {
  const cart = localStorage.getItem('cart');
  try {
    return cart ? JSON.parse(cart) : null;
  } catch {
    return null;
  }
}

// 4. Guardar el carrito en localStorage
function setLocalCart(cart) {
  if (cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
  }
}

// 5. Obtener el carrito persistente del backend
async function fetchBackendCart() {
  try {
    const response = await fetch('/api/cart', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
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

// 6. Subir el carrito local al backend
async function syncLocalCartToBackend(cart) {
  try {
    const response = await fetch('/api/cart/sync', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cart),
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

// 7. Comparar carritos
function cartsAreEqual(cartA, cartB) {
  return JSON.stringify(cartA) === JSON.stringify(cartB);
}

// 8. Lógica principal de sincronización
async function syncCart() {
  console.log('syncCart');
  if (!isUserLoggedIn()) return;

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

// 10. Sincronizar cada vez que el carrito local cambie
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

console.log("Script loaded");
syncCart();
observeCartChanges();

})();
