// Shopify client configuration for both Admin and Storefront APIs
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;

// Admin GraphQL client for products, orders, etc.
export const shopifyClient = {
  async query(options: { data: { query: string; variables?: any } }) {
    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
      throw new Error('Shopify credentials not configured');
    }

    const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify(options.data),
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const body = await response.json();
    return { body };
  },
};

// Storefront API client for checkouts (requires Storefront access token)
export const shopifyStorefrontClient = {
  async query(options: { data: { query: string; variables?: any } }) {
    if (!SHOPIFY_STORE_DOMAIN) {
      throw new Error('Shopify store domain not configured');
    }

    // For now, we'll use a simplified approach without Storefront API
    // In production, you'd need a Storefront access token
    console.log('Storefront API not configured, using fallback');
    return { body: { data: null } };
  },
};

// Simple REST client for Shopify
export const shopifyRestClient = {
  async get(path: string) {
    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
      throw new Error('Shopify credentials not configured');
    }

    const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-10${path}`, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    return response.json();
  },

  async post(path: string, data: any) {
    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
      throw new Error('Shopify credentials not configured');
    }

    const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-10${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    return response.json();
  },
};

// src/lib/shopify.ts (puedes agregar una función utilitaria)
export async function registerShopifyWebhook(shopDomain: string, accessToken: string, topic: string, address: string) {
  const response = await fetch(`https://${shopDomain}/admin/api/2023-10/webhooks.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({
      webhook: {
        topic, // Ejemplo: 'customers/login'
        address, // URL pública de tu endpoint, ej: 'https://tu-app.com/api/webhooks/customers-login'
        format: 'json',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to register webhook: ${error}`);
  }
  return response.json();
}

// GraphQL queries for Admin API
export const GET_PRODUCT_BY_HANDLE = `
  query getProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      vendor
      productType
      tags
      variants(first: 100) {
        edges {
          node {
            id
            title
            price
            inventoryQuantity
            sku
            image {
              id
              url
              altText
              width
              height
            }
            selectedOptions {
              name
              value
            }
          }
        }
      }
      images(first: 10) {
        edges {
          node {
            id
            url
            altText
            width
            height
          }
        }
      }
      options {
        id
        name
        values
      }
    }
  }
`;

export const GET_VARIANT_BY_ID = `
  query getVariantById($id: ID!) {
    productVariant(id: $id) {
      id
      title
      price
      inventoryQuantity
      sku
      product {
        id
        title
        handle
        images(first: 10) {
          edges {
            node {
              id
              url
              altText
              width
              height
            }
          }
        }
      }
      image {
        id
        url
        altText
        width
        height
      }
      selectedOptions {
        name
        value
      }
    }
  }
`;

// Draft Order creation (Admin API alternative to checkout)
export const CREATE_DRAFT_ORDER = `
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        invoiceUrl
        totalPrice
        currencyCode
        lineItems(first: 250) {
          edges {
            node {
              id
              title
              quantity
              variant {
                id
                title
                price
                image {
                  url
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// For now, we'll disable automatic checkout creation
export const CREATE_CHECKOUT = `
  query placeholder {
    shop {
      name
    }
  }
`;

export const UPDATE_CHECKOUT = `
  query placeholder {
    shop {
      name
    }
  }
`;

// Legacy export for compatibility
export const shopify = {
  clients: {
    Graphql: shopifyClient,
    Rest: shopifyRestClient,
  },
};

export async function registerShopifyScriptTag(shopDomain: string, accessToken: string, scriptUrl: string) {
  const response = await fetch(`https://${shopDomain}/admin/api/2023-10/script_tags.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({
      script_tag: {
        event: 'onload',
        src: scriptUrl,
        display_scope: 'online_store'
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to register ScriptTag: ${error}`);
  }
  return response.json();
} 

/**
 * Inserta un snippet de Liquid en theme.liquid para exponer el customer.id en window.CUSTOMER_ID
 * @param shopDomain - dominio de la tienda (ej: tienda.myshopify.com)
 * @param accessToken - access token de la tienda
 * @param snippet - código a insertar (opcional, por defecto el de CUSTOMER_ID)
 */
export async function injectCustomerIdSnippetToTheme(shopDomain: string, accessToken: string, snippet?: string) {
  // 1. Obtener el theme activo
  const themesRes = await fetch(`https://${shopDomain}/admin/api/2023-10/themes.json`, {
    headers: { 'X-Shopify-Access-Token': accessToken }
  });
  if (!themesRes.ok) throw new Error('No se pudo obtener la lista de themes');
  const themesData = await themesRes.json();
  const mainTheme = themesData.themes.find((t: any) => t.role === 'main');
  if (!mainTheme) throw new Error('No se encontró el theme principal');

  // 2. Obtener el contenido de theme.liquid
  const assetRes = await fetch(`https://${shopDomain}/admin/api/2023-10/themes/${mainTheme.id}/assets.json?asset[key]=layout/theme.liquid`, {
    headers: { 'X-Shopify-Access-Token': accessToken }
  });
  if (!assetRes.ok) throw new Error('No se pudo obtener theme.liquid');
  const assetData = await assetRes.json();
  let content = assetData.asset.value;

  // 3. Preparar el snippet
  const defaultSnippet = `<script>window.CUSTOMER_ID = {{ customer.id | json }};</script>`;
  const codeToInsert = snippet || defaultSnippet;

  // 4. Verificar si ya está inyectado
  if (content.includes('window.CUSTOMER_ID')) {
    return { updated: false, message: 'El snippet ya está presente en theme.liquid' };
  }

  // 5. Insertar antes de </head>
  content = content.replace('</head>', `${codeToInsert}\n</head>`);

  // 6. Subir el asset modificado
  const putRes = await fetch(`https://${shopDomain}/admin/api/2023-10/themes/${mainTheme.id}/assets.json`, {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      asset: {
        key: 'layout/theme.liquid',
        value: content
      }
    })
  });
  if (!putRes.ok) {
    const error = await putRes.text();
    throw new Error(`No se pudo actualizar theme.liquid: ${error}`);
  }

  return { updated: true, message: 'Snippet inyectado correctamente en theme.liquid' };
} 

