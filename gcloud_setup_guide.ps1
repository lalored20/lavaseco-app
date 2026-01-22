# ============================================================
# GUÍA RÁPIDA: INSTALACIÓN Y CONFIGURACIÓN DE GOOGLE CLOUD SDK
# ============================================================

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "📋 GUÍA DE INSTALACIÓN DE GOOGLE CLOUD SDK" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "El instalador de Google Cloud SDK está descargándose..." -ForegroundColor Yellow
Write-Host "`nPasos a seguir:" -ForegroundColor White
Write-Host ""
Write-Host "1️⃣  Presiona Enter en la ventana del instalador" -ForegroundColor Green
Write-Host "2️⃣  Cuando se abra el instalador gráfico:" -ForegroundColor Green
Write-Host "   - Acepta los términos de servicio" -ForegroundColor White
Write-Host "   - Deja la ruta de instalación por defecto" -ForegroundColor White
Write-Host "   - Marca la opción 'Run gcloud init'" -ForegroundColor White
Write-Host "   - Haz clic en 'Install'" -ForegroundColor White
Write-Host ""
Write-Host "3️⃣  Cuando termine la instalación:" -ForegroundColor Green
Write-Host "   - Se abrirá una ventana de terminal" -ForegroundColor White
Write-Host "   - Sigue las instrucciones para autenticarte" -ForegroundColor White
Write-Host "   - Selecciona el proyecto: mystic-bank-485003-j0" -ForegroundColor White
Write-Host ""
Write-Host "4️⃣  Después de la configuración:" -ForegroundColor Green
Write-Host "   - Cierra TODAS las terminales abiertas" -ForegroundColor White
Write-Host "   - Abre una nueva terminal" -ForegroundColor White
Write-Host "   - Ejecuta: gcloud --version" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "⏳ Esperando que completes la instalación..." -ForegroundColor Yellow
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Presiona cualquier tecla cuando hayas completado la instalación..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "`n✅ Perfecto! Ahora verifica que gcloud esté instalado..." -ForegroundColor Green
Write-Host "`nEjecutando: gcloud --version`n" -ForegroundColor Yellow

# Intentar ejecutar gcloud
try {
    gcloud --version
    Write-Host "`n✅ Google Cloud SDK instalado correctamente!" -ForegroundColor Green
    Write-Host "`n📋 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "1. Configura los secretos: bash setup_secrets.sh" -ForegroundColor White
    Write-Host "2. Despliega la aplicación: bash deploy.sh" -ForegroundColor White
    Write-Host "3. Ejecuta las pruebas: python test_production.py`n" -ForegroundColor White
}
catch {
    Write-Host "`n⚠️  gcloud aún no está disponible en esta terminal" -ForegroundColor Yellow
    Write-Host "Por favor:" -ForegroundColor Yellow
    Write-Host "1. Cierra esta terminal" -ForegroundColor White
    Write-Host "2. Abre una nueva terminal" -ForegroundColor White
    Write-Host "3. Ejecuta: gcloud --version" -ForegroundColor White
    Write-Host "4. Si funciona, continúa con: bash setup_secrets.sh`n" -ForegroundColor White
}
