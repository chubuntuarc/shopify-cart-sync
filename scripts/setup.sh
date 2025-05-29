#!/bin/bash

echo "🚀 Setting up Persistent Cart Middleware for Shopify..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    echo "   You can download it from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18 or higher is required. Current version: $(node -v)"
    echo "   Please update from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if database is available
echo "🔍 Checking for databases..."
DB_AVAILABLE=false

# Check PostgreSQL
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL detected"
    DB_AVAILABLE=true
fi

# Check MySQL
if command -v mysql &> /dev/null; then
    echo "✅ MySQL detected"
    DB_AVAILABLE=true
fi

if [ "$DB_AVAILABLE" = false ]; then
    echo "⚠️  No PostgreSQL or MySQL installation detected."
    echo "   To install PostgreSQL:"
    echo "   - macOS: brew install postgresql"
    echo "   - Ubuntu/Debian: sudo apt-get install postgresql"
    echo "   - Windows: https://www.postgresql.org/download/"
    echo ""
    echo "   To install MySQL:"
    echo "   - macOS: brew install mysql"
    echo "   - Ubuntu/Debian: sudo apt-get install mysql-server"
    echo "   - Windows: https://dev.mysql.com/downloads/"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error installing dependencies. Please check your internet connection."
    exit 1
fi

# Create .env.local file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "🔧 Creating .env.local file..."
    cp env.example .env.local
    echo "⚠️  IMPORTANT: Edit .env.local with your credentials:"
    echo "   - SHOPIFY_STORE_DOMAIN"
    echo "   - SHOPIFY_ACCESS_TOKEN"  
    echo "   - DATABASE_URL"
    echo "   - JWT_SECRET"
else
    echo "✅ .env.local file already exists"
fi

# Check if Prisma is configured
if [ -f "prisma/schema.prisma" ]; then
    echo "🎯 Generating Prisma client..."
    npx prisma generate
    
    if [ $? -eq 0 ]; then
        echo "✅ Prisma client generated successfully"
    else
        echo "❌ Error generating Prisma client"
        exit 1
    fi
    
    echo ""
    echo "⚠️  To configure the database:"
    echo "   1. Make sure DATABASE_URL is configured in .env.local"
    echo "   2. Run: npx prisma migrate dev --name init"
    echo "   3. (Optional) Open Prisma Studio: npx prisma studio"
else
    echo "❌ Prisma schema not found"
    exit 1
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. 📝 Edit .env.local with your Shopify and database credentials"
echo "2. 🗄️  Configure your database:"
echo "   npx prisma migrate dev --name init"
echo "3. 🚀 Run the application:"
echo "   npm run dev"
echo "4. 🌐 Open http://localhost:3000 in your browser"
echo ""
echo "📚 Read the README.md for:"
echo "   - Detailed Shopify configuration"
echo "   - Database setup instructions"
echo "   - API usage examples"
echo ""
echo "🆘 Need help? Check the documentation or create an issue on GitHub" 