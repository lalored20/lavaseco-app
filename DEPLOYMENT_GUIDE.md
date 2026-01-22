# 🚀 Guía de Despliegue Offline-First - Lavaseco App

## ⚡ Inicio Rápido

### Paso 1: Abrir Nueva Terminal con gcloud

1. **Cierra** todas las terminales actuales
2. **Abre** una nueva terminal de PowerShell
3. **Verifica** que gcloud esté disponible:
   ```powershell
   gcloud --version
   ```
   Deberías ver algo como: `Google Cloud SDK 456.0.0`

### Paso 2: Navegar al Proyecto

```powershell
cd "C:\Users\rmend\Desktop\LAVASECO ORQUIDEAS\lavaseco-app"
```

### Paso 3: Ejecutar Despliegue

```powershell
powershell -ExecutionPolicy Bypass -File deploy_offline_first.ps1
```

### Paso 4: Proporcionar Credenciales de Supabase

El script te pedirá:

1. **DATABASE_URL** - Connection string de Supabase
   - Ve a: https://supabase.com/dashboard/project/[tu-proyecto]/settings/database
   - Copia "Connection string" (modo Pooling)
   - Formato: `postgresql://postgres.[proyecto]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`

2. **DIRECT_URL** - Direct connection de Supabase
   - En la misma página, copia "Direct connection"
   - Formato: `postgresql://postgres.[proyecto]:[password]@aws-0-us-west-1.pooler.supabase.com:5432/postgres`

3. **NEXTAUTH_SECRET** - Se genera automáticamente ✅

---

## 📋 Checklist de Validación Offline

Una vez que el despliegue termine, sigue estos pasos para validar la funcionalidad offline:

### ✅ Fase 1: Instalación de PWA

- [ ] Abrir URL de producción en Chrome/Edge
- [ ] Hacer login con credenciales
- [ ] Buscar botón "Instalar" en la barra de direcciones
- [ ] Instalar como aplicación
- [ ] Verificar que se abre en ventana independiente

### ✅ Fase 2: Prueba Online (Baseline)

- [ ] Crear factura de prueba:
  - Cliente: "Test Online"
  - Teléfono: "3001234567"
  - Items: 1 camisa ($5,000)
- [ ] Verificar que aparece en lista
- [ ] Abrir Supabase Dashboard
- [ ] Verificar que la factura está en la tabla `Order`

### ✅ Fase 3: Prueba Offline (CRÍTICO)

- [ ] **DESCONECTAR Wi-Fi** en tu dispositivo
- [ ] Refrescar la página (F5)
- [ ] Verificar que la app carga (desde cache)
- [ ] Crear nueva factura:
  - Cliente: "Test Offline"
  - Teléfono: "3009876543"
  - Items: 2 pantalones ($10,000)
- [ ] Verificar que aparece en lista
- [ ] Registrar abono de $5,000
- [ ] Verificar que el balance se actualiza
- [ ] Intentar navegar entre páginas (Dashboard, Logística, Caja)
- [ ] Verificar que todo funciona sin errores

### ✅ Fase 4: Sincronización

- [ ] **RECONECTAR Wi-Fi**
- [ ] Esperar 10-15 segundos
- [ ] Buscar banner de sincronización (debe aparecer automáticamente)
- [ ] Verificar mensaje "Sincronizando facturas pendientes..."
- [ ] Esperar confirmación "Sincronización completada"
- [ ] Abrir Supabase Dashboard
- [ ] Verificar que "Test Offline" está en la tabla `Order`

### ✅ Fase 5: Persistencia

- [ ] **Cerrar** completamente el navegador
- [ ] **Desconectar Wi-Fi** nuevamente
- [ ] **Reabrir** la app PWA
- [ ] Verificar que ambas facturas (Online y Offline) siguen ahí
- [ ] Crear otra factura:
  - Cliente: "Test Persistencia"
  - Items: 1 chaqueta ($15,000)
- [ ] Cerrar y reabrir nuevamente
- [ ] Verificar que las 3 facturas están presentes

---

## 🐛 Troubleshooting

### Error: "gcloud: command not found"

**Solución:**
1. Cierra TODAS las terminales
2. Reinicia tu computadora
3. Abre nueva terminal
4. Verifica: `gcloud --version`

### Error: "Service Worker no se registra"

**Solución:**
1. Abre DevTools (F12)
2. Ve a Application → Service Workers
3. Verifica que aparece "service-worker.js"
4. Si no aparece, verifica que la URL es HTTPS

### Error: "IndexedDB quota exceeded"

**Solución:**
1. Abre DevTools (F12)
2. Ve a Application → Storage
3. Haz clic en "Clear site data"
4. Recarga la página

### La sincronización no funciona

**Solución:**
1. Abre DevTools (F12) → Console
2. Busca errores en rojo
3. Verifica que DATABASE_URL es correcta
4. Intenta sincronizar manualmente desde el banner

---

## 📊 Métricas de Éxito

Al final de las pruebas, deberías tener:

- ✅ **3 facturas** en total en Supabase
- ✅ **Service Worker** activo en DevTools
- ✅ **PWA instalada** como app nativa
- ✅ **Funcionalidad offline** 100% operativa
- ✅ **Sincronización** automática funcionando

---

## 🎯 Resultado Esperado

```
[SUCCESS] DESPLIEGUE COMPLETADO
============================================================
URL de Produccion: https://lavaseco-app-xxxxx-uc.a.run.app
Region: us-central1
Memoria: 2 GB
CPU: 2 vCPUs
============================================================

[TEST] PRUEBA DE FUNCIONALIDAD OFFLINE:
1. Abre: https://lavaseco-app-xxxxx-uc.a.run.app
2. Instala como PWA (boton Instalar)
3. Login con tus credenciales
4. DESCONECTA el Wi-Fi
5. Crea una factura de prueba
6. Verifica que se guarda localmente
7. RECONECTA el Wi-Fi
8. Espera 10 segundos (sincronizacion automatica)
9. Verifica en Supabase que la factura llego

[OK] URL guardada en PRODUCTION_URL.txt
```

---

## 📞 Próximos Pasos Después del Despliegue

1. **Avísame** cuando hayas completado el checklist de validación
2. **Comparte** la URL de producción
3. **Reporta** cualquier error que encuentres
4. **Confirma** que la funcionalidad offline funciona al 100%

Una vez validado, actualizaré el DASHBOARD.md con:
- ✅ URL de producción
- ✅ Estado de integridad offline: 100%
- ✅ Métricas de rendimiento
- ✅ Evidencia de pruebas
