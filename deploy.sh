#!/bin/bash

# ============================================================
# SCRIPT DE DESPLIEGUE A GOOGLE CLOUD RUN
# ============================================================

set -e

PROJECT_ID="mystic-bank-485003-j0"
REGION="us-central1"
SERVICE_NAME="lavaseco-app"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "============================================================"
echo "🚀 DESPLIEGUE A GOOGLE CLOUD RUN"
echo "============================================================"

# Verificar que gcloud esté configurado
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud no está instalado"
    exit 1
fi

# Configurar proyecto
gcloud config set project $PROJECT_ID

# Habilitar APIs necesarias
echo ""
echo "📡 Habilitando APIs necesarias..."
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Build y push de la imagen
echo ""
echo "🐳 Construyendo imagen Docker..."
gcloud builds submit --tag $IMAGE_NAME

# Obtener URL del servicio (si existe)
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)" 2>/dev/null || echo "")

# Desplegar a Cloud Run
echo ""
echo "🚀 Desplegando a Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-env-vars NEXTAUTH_URL=${SERVICE_URL:-https://lavaseco-app-placeholder.run.app} \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,DIRECT_URL=DIRECT_URL:latest,NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,E2B_API_KEY=E2B_API_KEY:latest,RESEND_API_KEY=RESEND_API_KEY:latest \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0 \
  --port 8080

# Obtener URL final
FINAL_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo ""
echo "============================================================"
echo "✅ DESPLIEGUE COMPLETADO"
echo "============================================================"
echo "🌐 URL de Producción: $FINAL_URL"
echo "📊 Región: $REGION"
echo "💾 Memoria: 2 GB"
echo "⚡ CPU: 2 vCPUs"
echo "============================================================"
echo ""
echo "🧪 Próximos pasos:"
echo "1. Visita: $FINAL_URL"
echo "2. Verifica health: $FINAL_URL/api/health"
echo "3. Revisa logs: gcloud run logs tail $SERVICE_NAME --region=$REGION"
echo ""
