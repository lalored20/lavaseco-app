@echo off
title LAVASECO ORQUIDEAS - CEREBRO ACTIVO
color 5f
echo ---------------------------------------------------
echo    INICIANDO LAVASECO ORQUIDEAS - PREMIUM SYSTEM
echo ---------------------------------------------------
echo.
echo [1/3] Preparando motores...
cd /d "%~dp0"

echo [2/3] Abriendo portal de acceso...
timeout /t 3 >nul
start "" "http://localhost:3000/login"

echo [3/3] Conectando Cerebro (Servidor)...
npm run dev
pause
