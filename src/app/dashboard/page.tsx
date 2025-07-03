'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Script from 'next/script';

interface ShopData {
  id: string;
  domain: string;
  name: string;
  email: string;
  plan_name: string;
  currency: string;
}

type Feature = {
  key: string;
  title: string;
  summary: string;
  iconBg: string;
  iconColor: string;
  icon: JSX.Element;
  details: JSX.Element;
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop');
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [appBridge, setAppBridge] = useState<any>(null);

  useEffect(() => {
    if (shop) {
      fetchShopData();
    }
  }, [shop]);

  useEffect(() => {
    // Initialize Shopify App Bridge when script loads
    if (typeof window !== 'undefined' && (window as any).ShopifyApp && shop) {
      const app = (window as any).ShopifyApp.init({
        apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '',
        shopOrigin: `https://${shop}`,
        debug: process.env.NODE_ENV === 'development',
      });
      setAppBridge(app);
    }
  }, [shop]);

  const fetchShopData = async () => {
    try {
      const response = await fetch(`/api/shopify/shop?shop=${shop}`);
      const data = await response.json();
      if (data.success) {
        setShopData(data.shop);
      }
    } catch (error) {
      console.error('Error fetching shop data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!shopData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">App Not Installed</h1>
          <p className="mt-2 text-gray-600">Please install the app from your Shopify admin.</p>
          <div className="mt-4">
            <a 
              href={`/api/shopify/install?shop=${shop}`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Install App
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Shopify App Bridge Script */}
      <Script
        src="https://unpkg.com/@shopify/app-bridge@3/umd/index.js"
        strategy="beforeInteractive"
      />

      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="md:flex md:items-center md:justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                  Welcome
                </h2>
                <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <span>Store: {shopData.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* App Status Card */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          App Status
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          Active
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Store Plan Card */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                          <path
                            fillRule="evenodd"
                            d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Shopify Plan
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {shopData.plan_name}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Currency Card */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Store Currency
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {shopData.currency}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Install Instructions */}
            <InstallInstructions />

            {/* Features Section */}
            <PersistentCartFeatures />
          </div>
        </div>
      </div>
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DashboardContent />
    </Suspense>
  );
}

function InstallInstructions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <button
            className="flex items-center justify-between w-full text-left text-lg font-medium text-gray-900 focus:outline-none"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="install-instructions-content"
          >
            <span>Install Instructions</span>
            <svg
              className={`w-5 h-5 ml-2 transition-transform ${
                open ? "transform rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {open && (
            <div id="install-instructions-content" className="mt-5 space-y-4">
              <p className="text-sm text-gray-500">
                To enable persistent cart sync, activate the{" "}
                <b>Arco - Cart Sync</b> app embed in your theme and add the
                section using the Shopify theme customizer:
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-500 space-y-1">
                <li>
                  Go to <b>Online Store → Themes</b> in your Shopify admin.
                </li>
                <li>
                  Click <b>Actions → Customize</b> on your current theme.
                </li>
                <li>
                  In the left sidebar, click the <b>App embeds</b> icon (puzzle
                  piece) and activate <b>Arco - Cart Sync</b>.
                </li>
                <li>Save your changes.</li>
              </ol>
              <div className="mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="flex justify-center">
                    <img
                      src="/arco_theme.png"
                      alt="Shopify app embed activation screenshot"
                      className="rounded border border-gray-200 shadow max-w-full h-auto"
                      style={{ maxWidth: "600px" }}
                    />
                  </div>
                  <div className="flex justify-center">
                    <div className="w-full" style={{ maxWidth: "600px" }}>
                      <div className="aspect-w-16 aspect-h-9">
                        <iframe
                          width="100%"
                          height="315"
                          src="https://www.youtube.com/embed/dqKqFE0BahE"
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        ></iframe>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PersistentCartFeatures() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Feature | null>(null);

  const features: Feature[] = [
    {
      key: "cross-device",
      title: "Cross-Device Cart Sync",
      summary: "Customers can access their cart from any device",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      details: (
        <>
          <h4 className="text-lg font-semibold mb-2">Cross-Device Cart Sync</h4>
          <p>
            When a customer logs in to your store from any device (mobile, tablet, or desktop), their cart is automatically synchronized.
            This means they can add products on one device and see the same cart on another device, as long as they use the same account.
            This seamless experience helps reduce cart abandonment and improves customer satisfaction.
          </p>
        </>
      ),
    },
    {
      key: "realtime",
      title: "Real-time Cart Updates",
      summary: "Instant synchronization across all sessions",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      details: (
        <>
          <h4 className="text-lg font-semibold mb-2">Real-time Cart Updates</h4>
          <p>
            Our system checks the stored cart in the session and reloads the user's screen if their cart is empty or different from the latest version.
            This ensures that the most recently updated cart is always active across all sessions and devices.
            Any changes made to the cart are instantly reflected, keeping the shopping experience consistent and up-to-date.
          </p>
        </>
      ),
    },
  ];

  const handleOpen = (feature: Feature) => {
    setActive(feature);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setActive(null);
  };

  return (
    <div className="mt-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Persistent Cart Features
          </h3>
          <div className="mt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <button
                  key={feature.key}
                  type="button"
                  className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 w-full text-left focus:outline-none hover:border-indigo-400 transition"
                  onClick={() => handleOpen(feature)}
                >
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 ${feature.iconBg} rounded-lg flex items-center justify-center`}>
                      <span className={feature.iconColor}>{feature.icon}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{feature.title}</p>
                    <p className="text-sm text-gray-500">{feature.summary}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      {open && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={handleClose}
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {active.details}
          </div>
        </div>
      )}
    </div>
  );
} 