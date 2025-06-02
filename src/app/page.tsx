'use client';

import { useState, useEffect } from 'react';
import { Cart, SessionResponse, Session } from '@/types';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shop = params.get('shop');
    const embedded = params.get('embedded');
    if (shop && !embedded) {
      router.replace(`/api/shopify/install?shop=${shop}`);
    }else{
      initializeSession();
    }
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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Arco - Cart Sync
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Never lose a sale again. Keep your customers' carts synchronized across all devices 
            and sessions with our powerful cart persistence solution for Shopify.
          </p>
        </div>

        {/* Installation Section */}
        <div className="bg-white rounded-xl shadow-xl p-8 mb-12 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Install on Your Shopify Store
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <div className="bg-gray-50 rounded-lg p-6 w-full max-w-md">
                <label htmlFor="shop-domain" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your Shopify store domain:
                </label>
                <div className="flex">
                  <input
                    type="text"
                    id="shop-domain"
                    placeholder="your-store"
                    className="flex-1 min-w-0 block px-3 py-2 border border-gray-300 rounded-l-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-r-md">
                    .myshopify.com
                  </span>
                </div>
                <button
                  onClick={() => {
                    const input = document.getElementById('shop-domain') as HTMLInputElement;
                    const shop = input.value.trim();
                    if (shop) {
                      window.location.href = `/api/shopify/install?shop=${shop}.myshopify.com`;
                    } else {
                      alert('Please enter your store domain');
                    }
                  }}
                  className="w-full mt-4 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                >
                  Install App
                </button>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>Or use the direct installation URL:</p>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                https://arco-henna.vercel.app/api/shopify/install?shop=YOUR-STORE.myshopify.com
              </code>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cross-Device Sync</h3>
            <p className="text-gray-600">Customers can access their cart from any device, anywhere.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Sessions</h3>
            <p className="text-gray-600">JWT-based authentication with device tracking for security.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Updates</h3>
            <p className="text-gray-600">Instant synchronization across all customer sessions.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
            <p className="text-gray-600">Track cart abandonment and recovery metrics.</p>
          </div>
        </div>

        {/* How it Works */}
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-600">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Install App</h3>
              <p className="text-gray-600">Install the app on your Shopify store with one click.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-600">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Automatic Sync</h3>
              <p className="text-gray-600">Customer carts are automatically synchronized across devices.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-600">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Increase Sales</h3>
              <p className="text-gray-600">Reduce cart abandonment and increase conversion rates.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 