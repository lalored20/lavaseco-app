# ============================================================
# SCRIPT CORREGIDO - MANEJA SECRETOS EXISTENTES
# ============================================================

$ErrorActionPreference = "Continue"  # No detener en errores

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "[AUTO-DEPLOY] Configuracion automatica de secretos y despliegue" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Credenciales
$DATABASE_URL = "postgresql://postgres.hlgodvwztylgcsaczbhy:Chayo20055_2@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
$DIRECT_URL = "postgresql://postgres:Chayo20055_2@db.hlgodvwztylgcsaczbhy.supabase.co:5432/postgres"

# Verificar gcloud
Write-Host "[1/7] Verificando Google Cloud SDK..." -ForegroundColor Yellow
try {
    $gcloudVersion = gcloud --version 2>&1 | Select-Object -First 1
    Write-Host "   [OK] $gcloudVersion" -ForegroundColor Green
}
catch {
    Write-Host "   [ERROR] gcloud no disponible" -ForegroundColor Red
    exit 1
}

# Configurar proyecto
Write-Host "`n[2/7] Configurando proyecto..." -ForegroundColor Yellow
gcloud config set project mystic-bank-485003-j0 --quiet 2>$null
Write-Host "   [OK] Proyecto configurado" -ForegroundColor Green

# Habilitar APIs
Write-Host "`n[3/7] Habilitando APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com --quiet 2>$null
gcloud services enable cloudbuild.googleapis.com --quiet 2>$null
gcloud services enable secretmanager.googleapis.com --quiet 2>$null
Write-Host "   [OK] APIs habilitadas" -ForegroundColor Green

# Función para crear o actualizar secreto
function Set-Secret {
    param($Name, $Value)
    
    Write-Host "   Configurando $Name..." -ForegroundColor Gray
    
    # Intentar crear
    $Value | gcloud secrets create $Name --data-file=- 2>$null
    
    # Si falló (ya existe), actualizar
    if ($LASTEXITCODE -ne 0) {
        Write-Host "     Secreto existe, actualizando version..." -ForegroundColor DarkGray
        $Value | gcloud secrets versions add $Name --data-file=- 2>$null
    }
    
    Write-Host "     [OK] $Name configurado" -ForegroundColor Green
}

# Crear secretos
Write-Host "`n[4/7] Creando/actualizando secretos..." -ForegroundColor Yellow

Set-Secret "DATABASE_URL" $DATABASE_URL
Set-Secret "DIRECT_URL" $DIRECT_URL

# NEXTAUTH_SECRET
$NEXTAUTH_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
Set-Secret "NEXTAUTH_SECRET" $NEXTAUTH_SECRET

Write-Host "   [OK] Todos los secretos configurados" -ForegroundColor Green

# Configurar permisos
Write-Host "`n[5/7] Configurando permisos..." -ForegroundColor Yellow
$projectNumber = gcloud projects describe mystic-bank-485003-j0 --format="value(projectNumber)" 2>$null
$serviceAccount = "$projectNumber-compute@developer.gserviceaccount.com"

$secrets = @("DATABASE_URL", "DIRECT_URL", "NEXTAUTH_SECRET")
foreach ($secret in $secrets) {
    gcloud secrets add-iam-policy-binding $secret `
        --member="serviceAccount:$serviceAccount" `
        --role="roles/secretmanager.secretAccessor" `
        --quiet 2>$null
}
Write-Host "   [OK] Permisos configurados" -ForegroundColor Green

# Build
Write-Host "`n[6/7] Construyendo imagen Docker..." -ForegroundColor Yellow
Write-Host "   (Esto tomara 5-10 minutos, por favor espera...)`n" -ForegroundColor Gray

$SERVICE_NAME = "lavaseco-app"
$REGION = "us-central1"
$IMAGE_NAME = "gcr.io/mystic-bank-485003-j0/$SERVICE_NAME"

gcloud builds submit --tag $IMAGE_NAME

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n   [ERROR] Fallo el build de Docker" -ForegroundColor Red
    exit 1
}

# Deploy
Write-Host "`n[7/7] Desplegando a Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
    --image $IMAGE_NAME `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --set-env-vars NODE_ENV=production `
    --set-secrets "DATABASE_URL=DATABASE_URL:latest,DIRECT_URL=DIRECT_URL:latest,NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest" `
    --memory 2Gi `
    --cpu 2 `
    --timeout 300 `
    --max-instances 10 `
    --min-instances 0 `
    --port 8080

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n   [ERROR] Fallo el despliegue" -ForegroundColor Red
    exit 1
}

# Obtener URL
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)"

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] DESPLIEGUE COMPLETADO" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan
Write-Host "URL de Produccion: $SERVICE_URL" -ForegroundColor Green
Write-Host "Region: $REGION" -ForegroundColor White
Write-Host "Memoria: 2 GB" -ForegroundColor White
Write-Host "CPU: 2 vCPUs" -ForegroundColor White
Write-Host "`n============================================================`n" -ForegroundColor Cyan

# Guardar URL
$SERVICE_URL | Out-File -FilePath "PRODUCTION_URL.txt" -Encoding UTF8
Write-Host "[OK] URL guardada en PRODUCTION_URL.txt`n" -ForegroundColor Green

Write-Host "Presiona Enter para salir..." -ForegroundColor Cyan
Read-Host
