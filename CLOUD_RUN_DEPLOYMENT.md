# 🚀 Despliegue a Google Cloud Run - Lavaseco App

## 📋 Estado Actual

✅ **Infraestructura creada:**
- Dockerfile optimizado (multi-stage build)
- Health check endpoint (`/api/health`)
- Scripts de despliegue automatizados
- Scripts de pruebas de estrés

⏳ **En progreso:**
- Instalación de Google Cloud SDK

## 🛠️ Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `Dockerfile` | Imagen Docker optimizada para Cloud Run |
| `.dockerignore` | Exclusiones para build de Docker |
| `deploy.sh` | Script de despliegue automatizado |
| `setup_secrets.sh` | Configuración de secretos en Secret Manager |
| `test_production.py` | Pruebas de estrés integral |
| `install_gcloud.ps1` | Instalador de Google Cloud SDK |
| `gcloud_setup_guide.ps1` | Guía interactiva de configuración |
| `src/app/api/health/route.ts` | Endpoint de health check |

## 📝 Instrucciones de Despliegue

### Paso 1: Completar Instalación de Google Cloud SDK

El instalador de Google Cloud SDK está ejecutándose. Sigue estos pasos:

1. **Presiona Enter** en la ventana del instalador que está esperando
2. **Completa la instalación** siguiendo el asistente gráfico
3. **Autentica** cuando se abra `gcloud init`
4. **Selecciona** el proyecto `mystic-bank-485003-j0`
5. **Cierra** todas las terminales y abre una nueva
6. **Verifica** con: `gcloud --version`

### Paso 2: Configurar Secretos

Una vez instalado gcloud, configura los secretos:

```bash
# En Git Bash o WSL
bash setup_secrets.sh
```

Te pedirá los siguientes valores:
- `DATABASE_URL` - URL de conexión a Supabase PostgreSQL
- `DIRECT_URL` - URL de conexión directa a Supabase
- `NEXTAUTH_SECRET` - Secret para NextAuth (se genera automáticamente si no lo tienes)
- `OPENAI_API_KEY` - API key de OpenAI
- `E2B_API_KEY` - API key de E2B Code Interpreter
- `RESEND_API_KEY` - API key de Resend (email)

### Paso 3: Desplegar a Cloud Run

```bash
# En Git Bash o WSL
bash deploy.sh
```

Este script:
1. Habilita las APIs necesarias
2. Construye la imagen Docker
3. La sube a Google Container Registry
4. Despliega el servicio en Cloud Run
5. Configura autoscaling y secretos
6. Te muestra la URL de producción

### Paso 4: Ejecutar Pruebas de Estrés

```bash
python test_production.py
```

Este script ejecuta:
- ✅ Health check
- ✅ Cold start performance
- ✅ Warm request performance
- ✅ Database connection persistence
- ✅ Concurrent request handling

### Paso 5: Verificación Manual

1. Abre la URL de producción en tu navegador
2. Prueba el flujo completo de facturación
3. Verifica que los datos persistan en Supabase
4. Revisa los logs: `gcloud run logs tail lavaseco-app --region=us-central1`

## 🔧 Configuración de Cloud Run

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| **Región** | us-central1 | Baja latencia para América |
| **Memoria** | 2 GB | Suficiente para Next.js + Prisma |
| **CPU** | 2 vCPUs | Rendimiento óptimo |
| **Timeout** | 300s | Para operaciones largas |
| **Min Instances** | 0 | Cost-effective (escala a 0) |
| **Max Instances** | 10 | Límite de autoscaling |
| **Puerto** | 8080 | Requerido por Cloud Run |

## 🐛 Troubleshooting

### Error: "gcloud: command not found"

**Solución:**
1. Cierra todas las terminales
2. Abre una nueva terminal
3. Verifica con `gcloud --version`
4. Si persiste, reinicia tu computadora

### Error: "Permission denied" al ejecutar .sh

**Solución:**
```bash
chmod +x deploy.sh setup_secrets.sh
```

### Error: Cold start muy lento (>10s)

**Solución:**
```bash
# Configurar min-instances=1
gcloud run services update lavaseco-app \
  --region=us-central1 \
  --min-instances=1
```

### Error: "Database connection failed"

**Solución:**
1. Verifica que `DATABASE_URL` esté correctamente configurado en Secret Manager
2. Asegúrate de usar la URL de Supabase con pooling
3. Verifica que `DIRECT_URL` también esté configurado

### Error: Build de Docker falla

**Solución:**
```bash
# Build local para debugging
docker build -t lavaseco-app .

# Ver logs detallados
docker build --progress=plain -t lavaseco-app .
```

## 📊 Monitoreo

### Ver logs en tiempo real
```bash
gcloud run logs tail lavaseco-app --region=us-central1
```

### Ver métricas
```bash
gcloud run services describe lavaseco-app --region=us-central1
```

### Ver estado del servicio
```bash
gcloud run services list
```

## 🔐 Seguridad

- ✅ Secretos almacenados en Secret Manager (no en .env)
- ✅ Usuario no-root en Docker
- ✅ HTTPS automático por Cloud Run
- ✅ Autenticación requerida para APIs sensibles
- ✅ Variables de entorno inyectadas de forma segura

## 💰 Costos Estimados

Con la configuración actual (min-instances=0):

- **Requests:** ~$0.40 por millón de requests
- **Compute:** ~$0.00002400 por vCPU-segundo
- **Memory:** ~$0.00000250 por GB-segundo
- **Estimado mensual:** $5-20 USD (dependiendo del tráfico)

Para reducir costos:
- Mantén `min-instances=0` (escala a 0 cuando no hay tráfico)
- Usa `max-instances` para limitar costos máximos
- Monitorea el uso en Google Cloud Console

## 📚 Recursos

- [Documentación de Cloud Run](https://cloud.google.com/run/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma con Cloud Run](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-cloud-run)

## 🎯 Próximos Pasos

1. ⏳ **Completar instalación de gcloud** (en progreso)
2. 🔐 **Configurar secretos** con `setup_secrets.sh`
3. 🚀 **Desplegar** con `deploy.sh`
4. 🧪 **Probar** con `test_production.py`
5. ✅ **Verificar** integridad al 100%
6. 📝 **Actualizar** DASHBOARD.md con resultados

---

**Última actualización:** 2026-01-22 12:36:00  
**Estado:** Infraestructura lista, esperando instalación de gcloud
