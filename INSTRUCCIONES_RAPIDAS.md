# ⚡ INSTRUCCIONES DE DESPLIEGUE RÁPIDO

## 🎯 Credenciales Configuradas

✅ Las credenciales de Supabase ya están en el script `auto_deploy.ps1`
✅ El script está listo para ejecutarse automáticamente

## 📋 Pasos para Desplegar (2 minutos)

### 1. Abre una NUEVA Terminal

**IMPORTANTE:** Debes abrir una **nueva terminal de PowerShell** para que `gcloud` esté disponible.

- Cierra esta terminal (opcional)
- Abre Windows PowerShell (nueva ventana)

### 2. Navega al Proyecto

```powershell
cd "C:\Users\rmend\Desktop\LAVASECO ORQUIDEAS\lavaseco-app"
```

### 3. Ejecuta el Script Automatizado

```powershell
powershell -ExecutionPolicy Bypass -File auto_deploy.ps1
```

## ⏱️ Qué Esperar

El script hará automáticamente:

1. ✅ Verificar gcloud (2 segundos)
2. ✅ Configurar proyecto (2 segundos)
3. ✅ Habilitar APIs (10 segundos)
4. ✅ Crear secretos en Secret Manager (5 segundos)
5. ✅ Configurar permisos (5 segundos)
6. ✅ **Construir imagen Docker (5-10 minutos)** ⏳
7. ✅ **Desplegar a Cloud Run (2-3 minutos)** ⏳
8. ✅ Entregar URL de producción

**Tiempo total estimado: 10-15 minutos**

## 🎉 Resultado Final

Al terminar verás:

```
============================================================
[SUCCESS] DESPLIEGUE COMPLETADO
============================================================

URL de Produccion: https://lavaseco-app-xxxxx-uc.a.run.app
Region: us-central1
Memoria: 2 GB
CPU: 2 vCPUs

============================================================
```

## 🧪 Después del Despliegue

1. Abre la URL en tu navegador
2. Instala como PWA
3. Prueba la funcionalidad offline siguiendo el checklist en `DEPLOYMENT_GUIDE.md`

---

**¿Problemas?**

Si ves "gcloud no disponible":
1. Verifica que instalaste Google Cloud SDK
2. Reinicia tu computadora
3. Abre una nueva terminal
4. Ejecuta: `gcloud --version` para confirmar

---

**Nota:** Las credenciales de Supabase ya están configuradas en el script. No necesitas ingresarlas manualmente.
