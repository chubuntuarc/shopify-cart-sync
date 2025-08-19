#!/bin/bash

echo "🛒 Shopify Cart Sync - Local Dev Helper"

# 1. Verifica Node y dependencias
if ! command -v node &> /dev/null; then
  echo "❌ Node.js no está instalado."
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "❌ npm no está instalado."
  exit 1
fi

# 2. Instala dependencias si es necesario
if [ ! -d "node_modules" ]; then
  echo "📦 Instalando dependencias..."
  npm install
fi

# 3. Verifica .env.local
if [ ! -f ".env.local" ]; then
  echo "❌ Falta el archivo .env.local. Cópialo desde env.example y edítalo con tus credenciales."
  exit 1
fi

# 4. Verifica variables de entorno críticas
REQUIRED_VARS=("SHOPIFY_API_KEY" "SHOPIFY_API_SECRET" "DATABASE_URL" "APP_URL" "SHOPIFY_STORE_DOMAIN")
for var in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "$var=" .env.local; then
    echo "❌ Falta la variable $var en .env.local"
    exit 1
  fi
done

# 5. Prepara la base de datos
echo "🗄️  Ejecutando migraciones de Prisma..."
npx prisma generate
npx prisma migrate dev --name dev-local --skip-seed

# 6. Inicia la app en modo desarrollo
echo "🚀 Iniciando la app en http://localhost:3000 ..."
npx next dev &

DEV_PID=$!
sleep 5

# 7. Abre el navegador para instalar la app en tu tienda de pruebas
SHOP_DOMAIN=$(grep SHOPIFY_STORE_DOMAIN .env.local | cut -d'=' -f2 | tr -d '"')
if [ -z "$SHOP_DOMAIN" ]; then
  echo "❌ No se pudo leer SHOPIFY_STORE_DOMAIN de .env.local"
  kill $DEV_PID
  exit 1
fi

INSTALL_URL="http://localhost:3000/api/shopify/install?shop=$SHOP_DOMAIN"
echo "🌐 Abriendo flujo de instalación Shopify: $INSTALL_URL"
if command -v open &> /dev/null; then
  open "$INSTALL_URL"
elif command -v xdg-open &> /dev/null; then
  xdg-open "$INSTALL_URL"
else
  echo "Por favor abre manualmente: $INSTALL_URL"
fi

echo "📝 Cuando termines de probar, puedes detener la app con: kill $DEV_PID"
wait $DEV_PID
