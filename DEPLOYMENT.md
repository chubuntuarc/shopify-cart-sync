# Deployment Guide - Shopify Persistent Cart App

## 🚀 Deploy to Vercel (Recommended)

### Prerequisites
1. Vercel account
2. PostgreSQL database (Vercel Postgres recommended)
3. Shopify Partner account for app creation

### Step 1: Setup Database
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Create a new PostgreSQL database:
   - Click "Storage" → "Create Database"
   - Choose "Postgres"
   - Note the `DATABASE_URL` from the connection details

### Step 2: Create Shopify App
1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Create a new app:
   - Choose "Create app"
   - Select "Custom app"
   - App name: "Persistent Cart"
   - App URL: `https://your-vercel-domain.vercel.app`
   - Allowed redirection URLs: `https://your-vercel-domain.vercel.app/api/shopify/auth`

### Step 3: Deploy to Vercel

#### Option A: Deploy with Git
1. Push your code to GitHub
2. Connect GitHub repo to Vercel
3. Configure environment variables (see below)
4. Deploy

#### Option B: Deploy with Vercel CLI
```bash
# Install Vercel CLI
bun add -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add SHOPIFY_API_KEY
vercel env add SHOPIFY_API_SECRET
vercel env add JWT_SECRET
vercel env add APP_URL
```

### Step 4: Environment Variables
Set these in Vercel Dashboard → Project → Settings → Environment Variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# Shopify App Credentials
SHOPIFY_API_KEY="your_shopify_api_key"
SHOPIFY_API_SECRET="your_shopify_api_secret"

# Security
JWT_SECRET="your-super-secret-jwt-key-256-bits-long"

# App Configuration
APP_URL="https://your-vercel-domain.vercel.app"
```

### Step 5: Database Migration
After deployment, run the database migration:

```bash
# Using Vercel CLI
vercel env pull .env.local
bun run prisma db push
```

### Step 6: Install App in Shopify Store

1. Get your app installation URL:
   ```
   https://your-vercel-domain.vercel.app/api/shopify/auth?shop=your-store.myshopify.com
   ```

2. Visit the URL in your browser
3. Complete OAuth flow
4. Access dashboard at: `https://your-vercel-domain.vercel.app/dashboard?shop=your-store.myshopify.com`

## 🔧 Alternative: Heroku Deployment

### Prerequisites
- Heroku account
- Heroku CLI installed

### Steps
1. Create Heroku app:
   ```bash
   heroku create your-app-name
   ```

2. Add PostgreSQL addon:
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

3. Set environment variables:
   ```bash
   heroku config:set SHOPIFY_API_KEY=your_key
   heroku config:set SHOPIFY_API_SECRET=your_secret
   heroku config:set JWT_SECRET=your_jwt_secret
   heroku config:set APP_URL=https://your-app-name.herokuapp.com
   ```

4. Deploy:
   ```bash
   git push heroku main
   ```

5. Run migrations:
   ```bash
   heroku run bun run prisma db push
   ```

## 📱 Shopify App Store Submission (Optional)

### Requirements for App Store
1. **App Listing**: Description, screenshots, pricing
2. **Privacy Policy**: Required for all apps
3. **Terms of Service**: Required for paid apps
4. **App Testing**: Test on multiple stores
5. **Security Review**: Shopify reviews all apps

### Submission Process
1. Complete app development and testing
2. Create app listing in Partner Dashboard
3. Submit for review
4. Address any feedback from Shopify
5. Publish to App Store

## 🔒 Security Considerations

### Production Checklist
- [ ] Use strong JWT secrets (256-bit minimum)
- [ ] Enable HTTPS only
- [ ] Validate all Shopify webhooks
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Use environment variables for secrets
- [ ] Regular security updates

### GDPR Compliance
- [ ] Add privacy policy
- [ ] Implement data deletion webhooks
- [ ] Allow customers to request data deletion
- [ ] Document data processing

## 🚨 Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify `DATABASE_URL` format
- Check database permissions
- Ensure Prisma client is generated

**Shopify OAuth Errors**
- Verify redirect URLs match exactly
- Check API key and secret
- Ensure scopes are correct

**Vercel Deployment Issues**
- Check build logs for errors
- Verify all environment variables are set
- Ensure Node.js version compatibility

### Support
- Shopify Partner Documentation: https://shopify.dev/docs
- Vercel Documentation: https://vercel.com/docs
- Prisma Documentation: https://www.prisma.io/docs

## 📊 Monitoring & Analytics

### Recommended Tools
- **Vercel Analytics**: Built-in performance monitoring
- **Shopify App Analytics**: Track app usage
- **Sentry**: Error tracking and monitoring
- **LogRocket**: Session replay and debugging

### Key Metrics to Track
- App installation rate
- Cart abandonment recovery
- User engagement
- API response times
- Error rates 