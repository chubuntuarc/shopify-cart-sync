# Persistent Cart Middleware for Shopify

This project is a middleware developed in **Next.js** that allows synchronizing Shopify cart between different devices using the same session. It's ideal for cases where users need to access their cart from multiple devices while maintaining product persistence.

## 🚀 Features

- ✅ **Persistent Cart**: Cart products are maintained between sessions and devices
- ✅ **Shopify Synchronization**: Direct integration with Shopify API for checkout
- ✅ **Secure Sessions**: Session management with HTTPOnly cookies and JWT
- ✅ **Database**: Local persistence with PostgreSQL/MySQL using Prisma
- ✅ **RESTful API**: Endpoints for easy integration with any frontend
- ✅ **Device Identification**: Fingerprinting to detect unique devices
- ✅ **CORS Enabled**: Ready to use as an independent service

## 🛠️ Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Static typing
- **Prisma** - Database ORM
- **Shopify API** - Shopify store integration
- **Tailwind CSS** - Utility styles
- **PostgreSQL/MySQL** - Database (configurable)

## 📦 Installation

### Prerequisites

- Node.js 18 or higher
- PostgreSQL or MySQL installed locally
- Shopify account with API access

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd persistent-cart
```

2. **Run automatic setup script**
```bash
./scripts/setup.sh
```

Or follow manual steps:

3. **Install dependencies manually**
```bash
npm install
```

4. **Configure environment variables**
```bash
cp env.example .env.local
```

Edit `.env.local` with your values:

```env
# Shopify Configuration
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-access-token
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/persistent_cart"

# JWT Secret
JWT_SECRET="your-super-secure-secret-key"

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="your-nextauth-secret"
```

5. **Configure the database**
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

6. **Run the application**
```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

The application will be available at `http://localhost:3000`

## 🗄️ Database Configuration

### PostgreSQL (Recommended)

1. **Install PostgreSQL**:
   - **macOS**: `brew install postgresql`
   - **Ubuntu/Debian**: `sudo apt-get install postgresql`
   - **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/)

2. **Create database**:
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE persistent_cart;

# Create user (optional)
CREATE USER cart_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE persistent_cart TO cart_user;
```

3. **Configure URL in .env.local**:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/persistent_cart"
# Or with custom user:
DATABASE_URL="postgresql://cart_user:your_password@localhost:5432/persistent_cart"
```

### MySQL (Alternative)

1. **Install MySQL**:
   - **macOS**: `brew install mysql`
   - **Ubuntu/Debian**: `sudo apt-get install mysql-server`
   - **Windows**: Download from [mysql.com](https://dev.mysql.com/downloads/)

2. **Create database**:
```sql
CREATE DATABASE persistent_cart;
```

3. **Configure URL in .env.local**:
```env
DATABASE_URL="mysql://root:password@localhost:3306/persistent_cart"
```

## 📱 Shopify Configuration

### 1. Create a Private App

1. Go to your Shopify Admin
2. Navigate to **Apps** > **App and sales channel settings**
3. Click on **Develop apps**
4. Create a new private app
5. Configure necessary permissions:
   - `read_products`
   - `write_checkouts`
   - `read_checkouts`

### 2. Get credentials

- **Access Token**: Found in the API credentials section
- **Store Domain**: your-store.myshopify.com
- **Webhook Secret**: (optional) to validate webhooks

## 🔧 API Endpoints

### Sessions

- **GET** `/api/session` - Get or create current session
- **POST** `/api/session` - Create new session with user

### Cart

- **GET** `/api/cart` - Get current cart
- **POST** `/api/cart` - Add product to cart
- **DELETE** `/api/cart` - Clear cart

### Cart Items

- **PUT** `/api/cart/items/[itemId]` - Update item quantity
- **DELETE** `/api/cart/items/[itemId]` - Remove item from cart

### Synchronization

- **POST** `/api/cart/sync` - Sync with Shopify and get checkout URL

## 💻 Usage as Middleware

### Example in Vanilla JavaScript

```javascript
// Initialize session
const session = await fetch('http://localhost:3000/api/session').then(r => r.json());

// Add product to cart
const cart = await fetch('http://localhost:3000/api/cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    variantId: '123456789',
    quantity: 1
  })
}).then(r => r.json());

// Sync with Shopify for checkout
const checkout = await fetch('http://localhost:3000/api/cart/sync', {
  method: 'POST'
}).then(r => r.json());

// Redirect to checkout
if (checkout.checkoutUrl) {
  window.location.href = checkout.checkoutUrl;
}
```

### Example with React

```jsx
import { useState, useEffect } from 'react';

function useCart() {
  const [cart, setCart] = useState(null);

  useEffect(() => {
    // Load cart on mount
    fetch('/api/cart')
      .then(r => r.json())
      .then(data => setCart(data.cart));
  }, []);

  const addToCart = async (variantId, quantity) => {
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId, quantity })
    });
    const data = await response.json();
    setCart(data.cart);
  };

  return { cart, addToCart };
}
```

## 🔄 How It Works

1. **Device Detection**: A unique fingerprint is generated for each device
2. **Persistent Session**: A session is created with JWT token stored in cookie
3. **Local Cart**: Products are saved in local database
4. **Synchronization**: On checkout, cart is created/updated in Shopify
5. **Cross-Device**: Same session token works on multiple devices

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Make sure you have a cloud PostgreSQL database (e.g., Supabase, PlanetScale)
4. Deploy automatically

### Netlify

Similar to Vercel, connect your repository and configure environment variables.

### VPS/Own Server

1. **Clone on server**:
```bash
git clone <your-repository>
cd persistent-cart
```

2. **Install dependencies**:
```bash
npm install
npm run build
```

3. **Configure environment variables** for production
4. **Use PM2 for process management**:
```bash
npm install -g pm2
pm2 start npm --name "persistent-cart" -- start
```

### Environment Variables for Production

```env
# Make sure to change these values in production
NODE_ENV=production
JWT_SECRET=your-super-secret-and-long-key
DATABASE_URL=your-production-database-url
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-production-token
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Linting
npm run lint

# Shopify Integration from local environment.
# This will load the environment variables from the shopify.env file.
# You can use the _example_shopify.env file as a reference.
source shopify.env && npm run dev
```
  
## 📊 Monitoring

The application includes logs to monitor:

- Session creation and management
- Cart operations
- Shopify synchronization
- Errors and exceptions

## 🔧 Useful Commands

```bash
# View database schema
npx prisma studio

# Reset database
npx prisma migrate reset

# Generate new migration
npx prisma migrate dev --name migration_name

# View logs in development
npm run dev

# Check TypeScript types
npx tsc --noEmit
```

## 🤝 Contributing

1. Fork the repository
2. Create a branch for your feature (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Review [Shopify API](https://shopify.dev/api) documentation
- Check [Next.js](https://nextjs.org/docs) documentation

## ⚠️ Security Considerations

- Change `JWT_SECRET` to a secure value in production
- Use HTTPS in production
- Configure CORS appropriately according to your needs
- Regularly review Shopify Private App permissions
- Keep dependencies updated
- Configure firewall on your database for production

## 🔄 Cross-Browser Session Management

This middleware includes advanced session sharing capabilities that allow you to access your cart from any browser or device using the same session.

### How to Share Sessions Between Browsers

#### Method 1: Using the Web Interface

1. **In your current browser:**
   - Open the application at `http://localhost:3000`
   - Add items to your cart
   - In the sidebar "Session Details" section, click the 📋 button next to your session token
   - The full session token will be copied to your clipboard

2. **In another browser:**
   - Open the application at `http://localhost:3000`
   - In the sidebar, click "Import Session"
   - Paste your session token in the input field
   - Click "Import Session"
   - Your cart will automatically sync and appear in the new browser

#### Method 2: Using the API Directly

```javascript
// Get current session token (from original browser)
const response = await fetch('/api/session');
const data = await response.json();
const sessionToken = data.session.sessionToken;

// Import session in new browser
const importResponse = await fetch('/api/session/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionToken })
});

if (importResponse.ok) {
  // Session imported successfully
  window.location.reload(); // Refresh to load the cart
}
```

#### Method 3: Manual Cookie Transfer

1. **In original browser:**
   - Open Developer Tools (F12)
   - Go to Application/Storage tab
   - Find cookies for `localhost:3000`
   - Copy the value of `persistent_cart_session` cookie

2. **In new browser:**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Execute: `document.cookie = "persistent_cart_session=YOUR_TOKEN_HERE; path=/; max-age=2592000"`
   - Refresh the page

### Security Considerations

- **Keep tokens private**: Session tokens provide full access to the cart
- **Token expiration**: Sessions expire after 30 days by default
- **Device tracking**: Each device is registered and tracked for security
- **HTTPS recommended**: Use HTTPS in production to protect tokens in transit

### API Endpoints for Session Management

- **GET** `/api/session` - Get current session or create new one
- **POST** `/api/session/import` - Import existing session using token

## 🧪 Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Linting
npm run lint

# Shopify Integration from local environment.
# This will load the environment variables from the shopify.env file.
# You can use the _example_shopify.env file as a reference.
source shopify.env && npm run dev
```
