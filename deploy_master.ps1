# ============================================================
# SCRIPT MAESTRO DE DESPLIEGUE A GOOGLE CLOUD RUN
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "[DEPLOY] DESPLIEGUE MAESTRO A GOOGLE CLOUD RUN" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Verificar que gcloud esté instalado
Write-Host "[1/7] Verificando Google Cloud SDK..." -ForegroundColor Yellow
try {
    $gcloudVersion = gcloud --version 2>&1 | Select-Object -First 1
    Write-Host "   [OK] $gcloudVersion" -ForegroundColor Green
}
catch {
    Write-Host "   [ERROR] Google Cloud SDK no esta instalado o no esta en PATH" -ForegroundColor Red
    Write-Host "`n   Por favor:" -ForegroundColor Yellow
    Write-Host "   1. Cierra esta terminal" -ForegroundColor White
    Write-Host "   2. Abre una NUEVA terminal" -ForegroundColor White
    Write-Host "   3. Ejecuta este script nuevamente`n" -ForegroundColor White
    exit 1
}

# Verificar proyecto configurado
Write-Host "`n[2/7] Verificando proyecto..." -ForegroundColor Yellow
$project = gcloud config get-value project 2>$null
if ($project -eq "mystic-bank-485003-j0") {
    Write-Host "   [OK] Proyecto: $project" -ForegroundColor Green
}
else {
    Write-Host "   [WARN] Proyecto actual: $project" -ForegroundColor Yellow
    Write-Host "   Configurando proyecto correcto..." -ForegroundColor Yellow
    gcloud config set project mystic-bank-485003-j0
    Write-Host "   [OK] Proyecto configurado: mystic-bank-485003-j0" -ForegroundColor Green
}

# Verificar autenticación
Write-Host "`n[3/7] Verificando autenticacion..." -ForegroundColor Yellow
$authAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if ($authAccount) {
    Write-Host "   [OK] Autenticado como: $authAccount" -ForegroundColor Green
}
else {
    Write-Host "   [ERROR] No hay cuenta autenticada" -ForegroundColor Red
    Write-Host "   Ejecutando: gcloud auth login" -ForegroundColor Yellow
    gcloud auth login
}

# Habilitar APIs necesarias
Write-Host "`n[4/7] Habilitando APIs necesarias..." -ForegroundColor Yellow
$apis = @(
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "   Habilitando $api..." -ForegroundColor Gray
    gcloud services enable $api --quiet
}
Write-Host "   [OK] APIs habilitadas" -ForegroundColor Green

# Configurar secretos
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "[SECRETS] CONFIGURACION DE SECRETOS" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Por favor, proporciona los valores de las siguientes variables:`n" -ForegroundColor Yellow

# DATABASE_URL
$DATABASE_URL = Read-Host "DATABASE_URL (Supabase PostgreSQL)"
if ($DATABASE_URL) {
    Write-Host "   Creando secreto DATABASE_URL..." -ForegroundColor Gray
    $DATABASE_URL | gcloud secrets create DATABASE_URL --data-file=- 2>$null
    if ($LASTEXITCODE -ne 0) {
        $DATABASE_URL | gcloud secrets versions add DATABASE_URL --data-file=-
    }
    Write-Host "   [OK] DATABASE_URL configurado" -ForegroundColor Green
}

# DIRECT_URL
$DIRECT_URL = Read-Host "`nDIRECT_URL (Supabase Direct Connection)"
if ($DIRECT_URL) {
    Write-Host "   Creando secreto DIRECT_URL..." -ForegroundColor Gray
    $DIRECT_URL | gcloud secrets create DIRECT_URL --data-file=- 2>$null
    if ($LASTEXITCODE -ne 0) {
        $DIRECT_URL | gcloud secrets versions add DIRECT_URL --data-file=-
    }
    Write-Host "   [OK] DIRECT_URL configurado" -ForegroundColor Green
}

# NEXTAUTH_SECRET
$NEXTAUTH_SECRET = Read-Host "`nNEXTAUTH_SECRET (deja vacio para generar automaticamente)"
if (-not $NEXTAUTH_SECRET) {
    $NEXTAUTH_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    Write-Host "   [OK] Generado automaticamente" -ForegroundColor Green
}
Write-Host "   Creando secreto NEXTAUTH_SECRET..." -ForegroundColor Gray
$NEXTAUTH_SECRET | gcloud secrets create NEXTAUTH_SECRET --data-file=- 2>$null
if ($LASTEXITCODE -ne 0) {
    $NEXTAUTH_SECRET | gcloud secrets versions add NEXTAUTH_SECRET --data-file=-
}
Write-Host "   [OK] NEXTAUTH_SECRET configurado" -ForegroundColor Green

# OPENAI_API_KEY
$OPENAI_API_KEY = Read-Host "`nOPENAI_API_KEY"
if ($OPENAI_API_KEY) {
    Write-Host "   Creando secreto OPENAI_API_KEY..." -ForegroundColor Gray
    $OPENAI_API_KEY | gcloud secrets create OPENAI_API_KEY --data-file=- 2>$null
    if ($LASTEXITCODE -ne 0) {
        $OPENAI_API_KEY | gcloud secrets versions add OPENAI_API_KEY --data-file=-
    }
    Write-Host "   [OK] OPENAI_API_KEY configurado" -ForegroundColor Green
}

# E2B_API_KEY
$E2B_API_KEY = Read-Host "`nE2B_API_KEY"
if ($E2B_API_KEY) {
    Write-Host "   Creando secreto E2B_API_KEY..." -ForegroundColor Gray
    $E2B_API_KEY | gcloud secrets create E2B_API_KEY --data-file=- 2>$null
    if ($LASTEXITCODE -ne 0) {
        $E2B_API_KEY | gcloud secrets versions add E2B_API_KEY --data-file=-
    }
    Write-Host "   [OK] E2B_API_KEY configurado" -ForegroundColor Green
}

# RESEND_API_KEY
$RESEND_API_KEY = Read-Host "`nRESEND_API_KEY"
if ($RESEND_API_KEY) {
    Write-Host "   Creando secreto RESEND_API_KEY..." -ForegroundColor Gray
    $RESEND_API_KEY | gcloud secrets create RESEND_API_KEY --data-file=- 2>$null
    if ($LASTEXITCODE -ne 0) {
        $RESEND_API_KEY | gcloud secrets versions add RESEND_API_KEY --data-file=-
    }
    Write-Host "   [OK] RESEND_API_KEY configurado" -ForegroundColor Green
}

# Configurar permisos
Write-Host "`n[5/7] Configurando permisos de acceso..." -ForegroundColor Yellow
$projectNumber = gcloud projects describe mystic-bank-485003-j0 --format="value(projectNumber)"
$serviceAccount = "$projectNumber-compute@developer.gserviceaccount.com"

$secrets = @("DATABASE_URL", "DIRECT_URL", "NEXTAUTH_SECRET", "OPENAI_API_KEY", "E2B_API_KEY", "RESEND_API_KEY")
foreach ($secret in $secrets) {
    gcloud secrets add-iam-policy-binding $secret `
        --member="serviceAccount:$serviceAccount" `
        --role="roles/secretmanager.secretAccessor" `
        --quiet 2>$null
}
Write-Host "   [OK] Permisos configurados" -ForegroundColor Green

# Despliegue a Cloud Run
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "[DEPLOY] DESPLIEGUE A CLOUD RUN" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

$SERVICE_NAME = "lavaseco-app"
$REGION = "us-central1"
$IMAGE_NAME = "gcr.io/mystic-bank-485003-j0/$SERVICE_NAME"

Write-Host "[6/7] Construyendo imagen Docker..." -ForegroundColor Yellow
gcloud builds submit --tag $IMAGE_NAME

Write-Host "`n[7/7] Desplegando a Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
    --image $IMAGE_NAME `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --set-env-vars NODE_ENV=production `
    --set-secrets "DATABASE_URL=DATABASE_URL:latest,DIRECT_URL=DIRECT_URL:latest,NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,E2B_API_KEY=E2B_API_KEY:latest,RESEND_API_KEY=RESEND_API_KEY:latest" `
    --memory 2Gi `
    --cpu 2 `
    --timeout 300 `
    --max-instances 10 `
    --min-instances 0 `
    --port 8080

# Obtener URL final
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)"

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] DESPLIEGUE COMPLETADO" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan
Write-Host "URL de Produccion: $SERVICE_URL" -ForegroundColor Green
Write-Host "Region: $REGION" -ForegroundColor White
Write-Host "Memoria: 2 GB" -ForegroundColor White
Write-Host "CPU: 2 vCPUs" -ForegroundColor White
Write-Host "`n============================================================`n" -ForegroundColor Cyan

Write-Host "[NEXT] Proximos pasos:" -ForegroundColor Yellow
Write-Host "1. Visita: $SERVICE_URL" -ForegroundColor White
Write-Host "2. Verifica health: $SERVICE_URL/api/health" -ForegroundColor White
Write-Host "3. Ejecuta pruebas: python test_production.py" -ForegroundColor White
Write-Host "4. Revisa logs: gcloud run logs tail $SERVICE_NAME --region=$REGION`n" -ForegroundColor White

# Guardar URL en archivo
$SERVICE_URL | Out-File -FilePath "PRODUCTION_URL.txt" -Encoding UTF8
Write-Host "[OK] URL guardada en PRODUCTION_URL.txt`n" -ForegroundColor Green
