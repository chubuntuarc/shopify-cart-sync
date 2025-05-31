# Plan de Pruebas - Sincronización de Carritos entre Dispositivos

## 🎯 Objetivo
Verificar que la funcionalidad de sincronización de carritos funciona correctamente entre diferentes dispositivos y sesiones de usuario.

## 🧪 Escenarios de Prueba

### 1. Prueba Básica de Sesión
**Objetivo**: Verificar que se crea una sesión correctamente
**Pasos**:
1. Abrir http://localhost:3000 en el navegador
2. Verificar que se muestra el token de sesión
3. Verificar que el carrito esté vacío inicialmente

**Resultado esperado**: Se crea una sesión nueva con un token único

### 2. Añadir Productos al Carrito
**Objetivo**: Verificar que se pueden añadir productos al carrito
**Pasos**:
1. Hacer clic en "Add Sample Product" 
2. Verificar que el producto aparece en el carrito
3. Añadir más productos con diferentes cantidades
4. Verificar el total del carrito

**Resultado esperado**: Los productos se añaden correctamente y se calcula el total

### 3. Sincronización entre Dispositivos - Método 1 (Token de Sesión)
**Objetivo**: Verificar que el carrito se sincroniza usando el token de sesión
**Pasos**:
1. En el Dispositivo A: Añadir productos al carrito
2. Copiar el token de sesión desde el Dispositivo A
3. En el Dispositivo B (o ventana incógnito): Abrir la aplicación
4. Hacer clic en "Import Session" 
5. Pegar el token de sesión y confirmar
6. Verificar que el carrito se sincroniza

**Resultado esperado**: El carrito del Dispositivo A aparece exactamente igual en el Dispositivo B

### 4. Modificaciones en Dispositivo Secundario
**Objetivo**: Verificar que las modificaciones se reflejan correctamente
**Pasos**:
1. En el Dispositivo B: Modificar cantidades de productos
2. Añadir nuevos productos
3. Eliminar algunos productos
4. Verificar los cambios en tiempo real

**Resultado esperado**: Todas las modificaciones se guardan correctamente

### 5. Sincronización con Shopify
**Objetivo**: Verificar que el carrito se sincroniza con Shopify para checkout
**Pasos**:
1. Con productos en el carrito, hacer clic en "Sync with Shopify"
2. Verificar que se abre una nueva ventana con el checkout de Shopify
3. Verificar que los productos y cantidades coinciden

**Resultado esperado**: Se crea un checkout de Shopify con los productos correctos

### 6. Persistencia de Sesión
**Objetivo**: Verificar que la sesión persiste después de cerrar el navegador
**Pasos**:
1. Añadir productos al carrito
2. Cerrar el navegador completamente
3. Volver a abrir el navegador y acceder a la aplicación
4. Verificar que el carrito se mantiene

**Resultado esperado**: El carrito se mantiene intacto después de reabrir el navegador

### 7. Prueba de Múltiples Dispositivos Simultáneos
**Objetivo**: Verificar sincronización en tiempo real (si está implementada)
**Pasos**:
1. Tener la misma sesión abierta en 2+ dispositivos
2. Modificar el carrito en un dispositivo
3. Refrescar la página en otros dispositivos
4. Verificar que los cambios se reflejan

**Resultado esperado**: Los cambios se propagan a todos los dispositivos

## 🔧 Herramientas de Prueba

### Simulación de Múltiples Dispositivos:
1. **Ventana principal**: Navegador normal
2. **Ventana incógnito**: Simula otro dispositivo
3. **Diferentes navegadores**: Chrome, Firefox, Safari
4. **Dispositivos móviles**: Usar herramientas de desarrollador para simular móvil

### Verificaciones a Realizar:
- ✅ Token de sesión se genera correctamente
- ✅ Productos se añaden al carrito
- ✅ Cantidades se actualizan correctamente
- ✅ Productos se eliminan correctamente
- ✅ Total del carrito se calcula bien
- ✅ Sincronización entre dispositivos funciona
- ✅ Checkout en Shopify se crea correctamente
- ✅ Persistencia de datos en base de datos
- ✅ Manejo de errores

## 📊 Datos de Prueba

### Productos de Ejemplo:
Si tu tienda Shopify tiene productos configurados, usar sus IDs reales.
Si no, la aplicación parece tener productos de muestra.

### Escenarios de Error a Probar:
- Token de sesión inválido
- Producto inexistente
- Cantidad negativa
- Problemas de conexión con Shopify

## 📝 Registro de Resultados

Para cada prueba, documentar:
- ✅ **PASS** / ❌ **FAIL**
- Comportamiento observado
- Errores encontrados
- Screenshots si es necesario

## 🚀 Instrucciones para Ejecutar las Pruebas

1. **Preparación**:
   ```bash
   # Asegurar que la aplicación esté corriendo
   npm run dev
   
   # Verificar que la base de datos esté funcionando
   npx prisma studio
   ```

2. **Acceso a la aplicación**:
   - URL principal: http://localhost:3000
   - Dashboard (si existe): http://localhost:3000/dashboard

3. **Herramientas útiles**:
   - DevTools del navegador para ver Network requests
   - Prisma Studio para verificar datos en la base de datos
   - Múltiples ventanas/navegadores para simular dispositivos

## 📱 Casos de Uso Reales

1. **Cliente en móvil**: Añade productos mientras camina
2. **Cliente en escritorio**: Continúa la compra desde casa
3. **Cliente indeciso**: Guarda carrito por días y regresa
4. **Múltiples sesiones**: Cliente usa varios dispositivos simultáneamente

¡Comencemos con las pruebas sistemáticas! 