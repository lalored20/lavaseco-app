# ============================================================
# SCRIPT SIMPLIFICADO DE DESPLIEGUE (SOLO SUPABASE)
# Offline-First PWA - Lavaseco App
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "[DEPLOY] DESPLIEGUE OFFLINE-FIRST A CLOUD RUN" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Verificar que gcloud esté instalado
Write-Host "[1/6] Verificando Google Cloud SDK..." -ForegroundColor Yellow
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
Write-Host "`n[2/6] Verificando proyecto..." -ForegroundColor Yellow
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
Write-Host "`n[3/6] Verificando autenticacion..." -ForegroundColor Yellow
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
Write-Host "`n[4/6] Habilitando APIs necesarias..." -ForegroundColor Yellow
$apis = @(
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "   Habilitando $api..." -ForegroundColor Gray
    gcloud services enable $api --quiet
}
Write-Host "   [OK] APIs habilitadas" -ForegroundColor Green

# Configurar secretos (SOLO SUPABASE)
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "[SECRETS] CONFIGURACION DE SECRETOS (SOLO SUPABASE)" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Necesitas las credenciales de Supabase:`n" -ForegroundColor Yellow
Write-Host "1. Ve a: https://supabase.com/dashboard/project/[tu-proyecto]/settings/database" -ForegroundColor Gray
Write-Host "2. Copia 'Connection string' y 'Direct connection'`n" -ForegroundColor Gray

# DATABASE_URL
$DATABASE_URL = Read-Host "DATABASE_URL (Supabase Connection String)"
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

# NEXTAUTH_SECRET (auto-generado)
Write-Host "`nGenerando NEXTAUTH_SECRET automaticamente..." -ForegroundColor Yellow
$NEXTAUTH_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
Write-Host "   Creando secreto NEXTAUTH_SECRET..." -ForegroundColor Gray
$NEXTAUTH_SECRET | gcloud secrets create NEXTAUTH_SECRET --data-file=- 2>$null
if ($LASTEXITCODE -ne 0) {
    $NEXTAUTH_SECRET | gcloud secrets versions add NEXTAUTH_SECRET --data-file=-
}
Write-Host "   [OK] NEXTAUTH_SECRET configurado" -ForegroundColor Green

# Configurar permisos
Write-Host "`n[5/6] Configurando permisos de acceso..." -ForegroundColor Yellow
$projectNumber = gcloud projects describe mystic-bank-485003-j0 --format="value(projectNumber)"
$serviceAccount = "$projectNumber-compute@developer.gserviceaccount.com"

$secrets = @("DATABASE_URL", "DIRECT_URL", "NEXTAUTH_SECRET")
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

Write-Host "[6/6] Construyendo y desplegando..." -ForegroundColor Yellow
Write-Host "`nEsto puede tomar 5-10 minutos. Por favor espera...`n" -ForegroundColor Gray

# Build
Write-Host "   Construyendo imagen Docker..." -ForegroundColor Gray
gcloud builds submit --tag $IMAGE_NAME --quiet

# Deploy
Write-Host "`n   Desplegando a Cloud Run..." -ForegroundColor Gray
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
    --port 8080 `
    --quiet

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

Write-Host "[TEST] PRUEBA DE FUNCIONALIDAD OFFLINE:" -ForegroundColor Yellow
Write-Host "1. Abre: $SERVICE_URL" -ForegroundColor White
Write-Host "2. Instala como PWA (boton Instalar)" -ForegroundColor White
Write-Host "3. Login con tus credenciales" -ForegroundColor White
Write-Host "4. DESCONECTA el Wi-Fi" -ForegroundColor White
Write-Host "5. Crea una factura de prueba" -ForegroundColor White
Write-Host "6. Verifica que se guarda localmente" -ForegroundColor White
Write-Host "7. RECONECTA el Wi-Fi" -ForegroundColor White
Write-Host "8. Espera 10 segundos (sincronizacion automatica)" -ForegroundColor White
Write-Host "9. Verifica en Supabase que la factura llego`n" -ForegroundColor White

# Guardar URL en archivo
$SERVICE_URL | Out-File -FilePath "PRODUCTION_URL.txt" -Encoding UTF8
Write-Host "[OK] URL guardada en PRODUCTION_URL.txt`n" -ForegroundColor Green

Write-Host "Presiona Enter para salir..." -ForegroundColor Cyan
Read-Host
