# 🚀 Instalación Automática de Google Cloud SDK
# Este script descarga e instala Google Cloud SDK en Windows

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🌐 INSTALADOR DE GOOGLE CLOUD SDK" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# URL del instalador
$installerUrl = "https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe"
$installerPath = "$env:TEMP\GoogleCloudSDKInstaller.exe"

Write-Host "`n📥 Descargando Google Cloud SDK..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
    Write-Host "✅ Descarga completada" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al descargar: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n🔧 Iniciando instalación..." -ForegroundColor Yellow
Write-Host "⚠️  Se abrirá el instalador. Por favor:" -ForegroundColor Yellow
Write-Host "   1. Acepta los términos" -ForegroundColor White
Write-Host "   2. Deja la ruta de instalación por defecto" -ForegroundColor White
Write-Host "   3. Marca 'Run gcloud init' al finalizar" -ForegroundColor White
Write-Host "`nPresiona Enter para continuar..." -ForegroundColor Cyan
Read-Host

# Ejecutar instalador
Start-Process -FilePath $installerPath -Wait

Write-Host "`n✅ Instalación completada" -ForegroundColor Green
Write-Host "`n⚠️  IMPORTANTE: Cierra y vuelve a abrir tu terminal para que gcloud esté disponible" -ForegroundColor Yellow
Write-Host "`nPróximos pasos:" -ForegroundColor Cyan
Write-Host "1. Cierra esta terminal" -ForegroundColor White
Write-Host "2. Abre una nueva terminal" -ForegroundColor White
Write-Host "3. Ejecuta: gcloud init" -ForegroundColor White
Write-Host "4. Selecciona el proyecto: mystic-bank-485003-j0" -ForegroundColor White
