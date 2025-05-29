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