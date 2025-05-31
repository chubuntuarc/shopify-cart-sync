#!/bin/bash

echo "🚀 Deploying Shopify Persistent Cart App to Vercel"
echo "=================================================="

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please log in to Vercel:"
    vercel login
fi

echo "📦 Building and deploying..."
vercel --prod

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up environment variables in Vercel dashboard"
echo "2. Create Shopify app in Partner dashboard"
echo "3. Configure app URLs and OAuth redirect"
echo "4. Run database migration: npx prisma db push"
echo "5. Test app installation with: https://your-domain.vercel.app/api/shopify/auth?shop=your-store.myshopify.com"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions" 