'use client';

import { useState, useEffect } from 'react';
import { Cart, CartItem, SessionResponse, Session } from '@/types';

export default function Home() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [importToken, setImportToken] = useState('');
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      const response = await fetch('/api/session');
      const data: SessionResponse = await response.json();
      
      if (data.success && data.session) {
        setSession(data.session);
        setCart(data.session.cart || null);
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (variantId: string, quantity: number = 1) => {
    setAdding(true);
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variantId,
          quantity,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCart(data.cart);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAdding(false);
    }
  };

  const updateCartItem = async (itemId: string, quantity: number) => {
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      });

      const data = await response.json();
      if (data.success) {
        setCart(data.cart);
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setCart(data.cart);
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const clearCart = async () => {
    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setCart(data.cart);
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const syncWithShopify = async () => {
    try {
      const response = await fetch('/api/cart/sync', {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        setCart(data.cart);
        if (data.checkoutUrl) {
          window.open(data.checkoutUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Error syncing with Shopify:', error);
    }
  };

  const importSession = async () => {
    if (!importToken.trim()) {
      alert('Please enter a session token');
      return;
    }

    setImporting(true);
    try {
      const response = await fetch('/api/session/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionToken: importToken.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSession(data.session);
        setCart(data.session.cart || null);
        setImportToken('');
        setShowImport(false);
        alert('Session imported successfully!');
        // Refresh the page to ensure everything is properly loaded
        window.location.reload();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error importing session:', error);
      alert('Failed to import session. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const copySessionToken = () => {
    if (session?.sessionToken) {
      navigator.clipboard.writeText(session.sessionToken);
      alert('Session token copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-light text-gray-900">
                Persistent Cart
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Cross-device synchronization middleware
              </p>
            </div>
            {session && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Session</p>
                <p className="text-sm font-mono text-gray-600">
                  {session.sessionToken.slice(0, 8)}...
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Test Products */}
          <div className="lg:col-span-4">
            <div className="sticky top-8">
              <h2 className="text-lg font-medium text-gray-900 mb-6">
                Test Products
              </h2>

              <div className="space-y-4">
                <div className="group">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100 hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">Product A</h3>
                        <p className="text-sm text-gray-500">
                          Demo item for testing
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-semibold">A</span>
                      </div>
                    </div>
                    <button
                      onClick={() => addToCart("47694838431977")}
                      disabled={adding}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {adding ? "Adding..." : "Add to Cart"}
                    </button>
                  </div>
                </div>

                <div className="group">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-100 hover:border-green-200 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">Product B</h3>
                        <p className="text-sm text-gray-500">
                          Another demo item
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-semibold">B</span>
                      </div>
                    </div>
                    <button
                      onClick={() => addToCart("47694838464745")}
                      disabled={adding}
                      className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {adding ? "Adding..." : "Add to Cart"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Session Info */}
              <div className="mt-8 pt-8 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    Session Details
                  </h3>
                  <button
                    onClick={() => setShowImport(!showImport)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showImport ? 'Hide Import' : 'Import Session'}
                  </button>
                </div>
                
                {session && (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">ID</span>
                      <span className="font-mono text-gray-700">
                        {session.id.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Token</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-gray-700">
                          {session.sessionToken.slice(0, 8)}...
                        </span>
                        <button
                          onClick={copySessionToken}
                          className="text-blue-600 hover:text-blue-700"
                          title="Copy full token"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Expires</span>
                      <span className="text-gray-700">
                        {new Date(session.expires).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Import Session Interface */}
                {showImport && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                      Import Session from Another Browser
                    </h4>
                    <p className="text-xs text-blue-700 mb-3">
                      Paste the session token from another browser to sync your cart.
                    </p>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={importToken}
                        onChange={(e) => setImportToken(e.target.value)}
                        placeholder="Paste session token here..."
                        className="w-full px-3 py-2 text-xs border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={importSession}
                          disabled={importing || !importToken.trim()}
                          className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium rounded-md transition-colors"
                        >
                          {importing ? 'Importing...' : 'Import Session'}
                        </button>
                        <button
                          onClick={() => setShowImport(false)}
                          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cart */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Shopping Cart
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {cart?.items?.length || 0}{" "}
                  {cart?.items?.length === 1 ? "item" : "items"}
                </p>
              </div>

              {cart && cart.items && cart.items.length > 0 && (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={syncWithShopify}
                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Sync with Shopify
                  </button>
                  <button
                    onClick={clearCart}
                    className="px-4 py-2 border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {cart && cart.items && cart.items.length > 0 ? (
              <div className="space-y-6">
                {/* Cart Items */}
                <div className="divide-y divide-gray-100">
                  {cart.items.map((item: CartItem) => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-400 text-xs">IMG</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900">
                            {item.title}
                          </h3>
                          {item.variant_title && (
                            <p className="text-sm text-gray-500 mt-1">
                              {item.variant_title}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 mt-1">
                            ${item.price.toFixed(2)} each
                          </p>
                        </div>

                        <div className="flex items-center space-x-3">
                          {/* Quantity Controls */}
                          <div className="flex items-center border border-gray-200 rounded-lg">
                            <button
                              onClick={() =>
                                updateCartItem(item.id, item.quantity - 1)
                              }
                              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M20 12H4"
                                />
                              </svg>
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-gray-900">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateCartItem(item.id, item.quantity + 1)
                              }
                              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                              </svg>
                            </button>
                          </div>

                          {/* Total Price */}
                          <div className="text-right min-w-[80px]">
                            <p className="font-medium text-gray-900">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cart Total */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">
                      Total
                    </span>
                    <span className="text-2xl font-medium text-gray-900">
                      ${cart.totalPrice.toFixed(2)} {cart.currency}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z"
                    />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">
                  Your cart is empty
                </h3>
                <p className="text-gray-500 text-sm">
                  Add some products to get started
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cross-Browser Instructions */}
        <div className="mt-16 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            🔄 Cross-Browser Session Sync
          </h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            Access your cart from any browser or device by sharing your session token. Perfect for switching between devices while shopping.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2">1</span>
                Copy Session Token
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                In your current browser, click the 📋 button next to your session token to copy it to clipboard.
              </p>
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <code className="text-xs text-gray-600">Session Token: {session?.sessionToken ? `${session.sessionToken.slice(0, 16)}...` : 'xxxx-xxxx-xxxx-xxxx'}</code>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2">2</span>
                Import in New Browser
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                In another browser, click &ldquo;Import Session&rdquo; in the sidebar and paste your token.
              </p>
              <div className="bg-white p-3 rounded-lg border border-green-200">
                <p className="text-xs text-gray-600">✅ Your cart will sync automatically</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white rounded-lg border border-orange-200">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 text-orange-500 mt-0.5">⚠️</div>
              <div>
                <h4 className="font-medium text-orange-900 text-sm">Security Note</h4>
                <p className="text-xs text-orange-700 mt-1">
                  Only share session tokens with yourself. These tokens provide access to your cart and should be kept private.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="mt-20 pt-16 border-t border-gray-100">
          <div className="max-w-3xl">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              About This Middleware
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              This Next.js middleware enables seamless Shopify cart
              synchronization across different devices using secure session
              management. Perfect for creating consistent shopping experiences.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">
                    Automatic Sync
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Real-time synchronization with Shopify
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">
                    Cross-Device
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Persistent cart across all devices
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">
                    Secure Sessions
                  </h3>
                  <p className="text-gray-500 text-sm">
                    HTTPOnly cookies with JWT tokens
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">
                    RESTful API
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Easy integration with any frontend
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 