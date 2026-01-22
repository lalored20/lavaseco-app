#!/usr/bin/env python3
"""
Script de diagnóstico para verificar conexión con Google Cloud Vertex AI
"""
import json
import os
import sys
import traceback

def main():
    print("=" * 60)
    print("🔍 DIAGNÓSTICO DE CONEXIÓN GOOGLE CLOUD VERTEX AI")
    print("=" * 60)
    print()
    
    # 1. Leer credenciales desde settings.json
    settings_path = r'C:\Users\rmend\AppData\Roaming\Antigravity\User\settings.json'
    print(f"📂 Leyendo credenciales desde: {settings_path}")
    
    try:
        with open(settings_path, 'r', encoding='utf-8') as f:
            settings = json.load(f)
        
        credentials = settings.get('antigravity.googleCloud.serviceAccountKey')
        if not credentials:
            print("❌ ERROR: No se encontró 'antigravity.googleCloud.serviceAccountKey' en settings.json")
            sys.exit(1)
        
        project_id = credentials.get('project_id')
        client_email = credentials.get('client_email')
        
        print(f"✅ Credenciales encontradas:")
        print(f"   - Proyecto: {project_id}")
        print(f"   - Service Account: {client_email}")
        print()
        
    except FileNotFoundError:
        print(f"❌ ERROR: No se encontró el archivo {settings_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ ERROR: El archivo settings.json no es un JSON válido: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ ERROR inesperado al leer settings.json:")
        print(traceback.format_exc())
        sys.exit(1)
    
    # 2. Verificar si google-cloud-aiplatform está instalado
    print("📦 Verificando dependencias de Google Cloud...")
    try:
        import google.auth
        from google.cloud import aiplatform
        from google.oauth2 import service_account
        print("✅ Librería google-cloud-aiplatform instalada")
        print()
    except ImportError as e:
        print("❌ ERROR: google-cloud-aiplatform no está instalado")
        print(f"   Detalles: {e}")
        print()
        print("💡 SOLUCIÓN: Ejecuta el siguiente comando:")
        print("   pip install google-cloud-aiplatform")
        print()
        sys.exit(1)
    except Exception as e:
        print(f"❌ ERROR inesperado al importar librerías:")
        print(traceback.format_exc())
        sys.exit(1)
    
    # 3. Intentar autenticación
    print("🔐 Intentando autenticación con Service Account...")
    try:
        # Crear credenciales desde el diccionario
        credentials_obj = service_account.Credentials.from_service_account_info(credentials)
        print("✅ Credenciales cargadas correctamente")
        print()
    except Exception as e:
        print(f"❌ ERROR al cargar credenciales: {e}")
        sys.exit(1)
    
    # 4. Inicializar Vertex AI
    print("🚀 Inicializando Vertex AI...")
    try:
        aiplatform.init(
            project=project_id,
            location='us-central1',  # Región por defecto
            credentials=credentials_obj
        )
        print("✅ Vertex AI inicializado correctamente")
        print()
    except Exception as e:
        print(f"❌ ERROR al inicializar Vertex AI: {e}")
        print()
        
        # Diagnóstico específico de errores comunes
        error_str = str(e).lower()
        
        if 'billing' in error_str or 'facturación' in error_str:
            print("💳 PROBLEMA DETECTADO: Facturación")
            print("   - El proyecto no tiene facturación habilitada")
            print("   - Solución: https://console.cloud.google.com/billing")
            print()
        
        if 'api' in error_str and 'not enabled' in error_str:
            print("🔌 PROBLEMA DETECTADO: API no habilitada")
            print("   - La API de Vertex AI no está activada en tu proyecto")
            print("   - Solución: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com")
            print()
        
        if 'permission' in error_str or 'forbidden' in error_str:
            print("🔒 PROBLEMA DETECTADO: Permisos")
            print("   - El Service Account no tiene los permisos necesarios")
            print("   - Roles necesarios: Vertex AI User, Vertex AI Administrator")
            print()
        
        if 'quota' in error_str:
            print("📊 PROBLEMA DETECTADO: Cuota excedida")
            print("   - Has alcanzado el límite de uso de la API")
            print()
        
        sys.exit(1)
    
    # 5. Intentar listar modelos (prueba real de conexión)
    print("🧪 Probando conexión real con Vertex AI...")
    print("   (Intentando listar modelos disponibles...)")
    print()
    
    try:
        # Intentar listar modelos de Gemini
        models = aiplatform.Model.list(
            filter='labels.google-vertex-ai-model-garden:gemini',
            order_by='create_time desc'
        )
        
        print("✅ ¡CONEXIÓN EXITOSA!")
        print()
        print(f"📋 Se encontraron {len(list(models))} modelos disponibles")
        print()
        print("=" * 60)
        print("✨ DIAGNÓSTICO COMPLETO: TODO FUNCIONANDO CORRECTAMENTE")
        print("=" * 60)
        
    except Exception as e:
        print(f"⚠️  ERROR en prueba de conexión: {e}")
        print()
        
        # Diagnóstico adicional
        error_str = str(e).lower()
        
        if '403' in error_str or 'forbidden' in error_str:
            print("🔒 ERROR 403: Acceso denegado")
            print("   Causas posibles:")
            print("   1. API de Vertex AI no habilitada")
            print("   2. Service Account sin permisos suficientes")
            print("   3. Facturación no configurada")
            print()
            print("🔗 Enlaces útiles:")
            print("   - Habilitar API: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=mystic-bank-485003-j0")
            print("   - Configurar facturación: https://console.cloud.google.com/billing/linkedaccount?project=mystic-bank-485003-j0")
            print()
        
        if '404' in error_str:
            print("🔍 ERROR 404: Recurso no encontrado")
            print("   - Verifica que el proyecto 'mystic-bank-485003-j0' existe")
            print("   - Verifica que la región 'us-central1' es correcta")
            print()
        
        sys.exit(1)

if __name__ == "__main__":
    main()
