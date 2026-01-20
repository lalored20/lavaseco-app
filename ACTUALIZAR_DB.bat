@echo off
title ACTUALIZANDO BASE DE DATOS - ORQUIDEAS
color 0f
echo ---------------------------------------------------
echo    ACTUALIZANDO SISTEMA...
echo ---------------------------------------------------
echo.
echo [1/2] Regenerando cliente de Base de Datos...
cd /d "%~dp0"
call npx prisma generate
echo.
echo [2/2] Proceso finalizado.
echo.
echo ---------------------------------------------------
echo    YA PUEDES CERRAR ESTA VENTANA Y EJECUTAR INICIAR.BAT
echo ---------------------------------------------------
pause
