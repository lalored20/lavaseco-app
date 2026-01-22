#!/bin/bash

# ============================================================
# SCRIPT DE CONFIGURACIÓN DE SECRETOS EN GOOGLE CLOUD
# ============================================================

set -e

PROJECT_ID="mystic-bank-485003-j0"
REGION="us-central1"

echo "============================================================"
echo "🔐 CONFIGURACIÓN DE SECRETOS EN SECRET MANAGER"
echo "============================================================"

# Verificar que gcloud esté configurado
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud no está instalado"
    exit 1
fi

# Configurar proyecto
gcloud config set project $PROJECT_ID

# Habilitar Secret Manager API
echo ""
echo "📡 Habilitando Secret Manager API..."
gcloud services enable secretmanager.googleapis.com

# Obtener el número del proyecto para permisos
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo ""
echo "📝 Por favor, proporciona los valores de las siguientes variables:"
echo ""

# DATABASE_URL
read -p "DATABASE_URL (Supabase PostgreSQL): " DATABASE_URL
echo -n "$DATABASE_URL" | gcloud secrets create DATABASE_URL --data-file=- 2>/dev/null || \
echo -n "$DATABASE_URL" | gcloud secrets versions add DATABASE_URL --data-file=-

# DIRECT_URL
read -p "DIRECT_URL (Supabase Direct Connection): " DIRECT_URL
echo -n "$DIRECT_URL" | gcloud secrets create DIRECT_URL --data-file=- 2>/dev/null || \
echo -n "$DIRECT_URL" | gcloud secrets versions add DIRECT_URL --data-file=-

# NEXTAUTH_SECRET
read -p "NEXTAUTH_SECRET (genera uno nuevo si no tienes): " NEXTAUTH_SECRET
if [ -z "$NEXTAUTH_SECRET" ]; then
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    echo "✅ Generado automáticamente: $NEXTAUTH_SECRET"
fi
echo -n "$NEXTAUTH_SECRET" | gcloud secrets create NEXTAUTH_SECRET --data-file=- 2>/dev/null || \
echo -n "$NEXTAUTH_SECRET" | gcloud secrets versions add NEXTAUTH_SECRET --data-file=-

# OPENAI_API_KEY
read -p "OPENAI_API_KEY: " OPENAI_API_KEY
echo -n "$OPENAI_API_KEY" | gcloud secrets create OPENAI_API_KEY --data-file=- 2>/dev/null || \
echo -n "$OPENAI_API_KEY" | gcloud secrets versions add OPENAI_API_KEY --data-file=-

# E2B_API_KEY
read -p "E2B_API_KEY: " E2B_API_KEY
echo -n "$E2B_API_KEY" | gcloud secrets create E2B_API_KEY --data-file=- 2>/dev/null || \
echo -n "$E2B_API_KEY" | gcloud secrets versions add E2B_API_KEY --data-file=-

# RESEND_API_KEY
read -p "RESEND_API_KEY: " RESEND_API_KEY
echo -n "$RESEND_API_KEY" | gcloud secrets create RESEND_API_KEY --data-file=- 2>/dev/null || \
echo -n "$RESEND_API_KEY" | gcloud secrets versions add RESEND_API_KEY --data-file=-

echo ""
echo "🔑 Configurando permisos de acceso..."

# Dar permisos al servicio de Cloud Run
for SECRET in DATABASE_URL DIRECT_URL NEXTAUTH_SECRET OPENAI_API_KEY E2B_API_KEY RESEND_API_KEY; do
    gcloud secrets add-iam-policy-binding $SECRET \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet
done

echo ""
echo "✅ Secretos configurados exitosamente"
echo "============================================================"
