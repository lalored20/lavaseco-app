#!/usr/bin/env python3
import json
import sys

print("Iniciando diagnóstico con archivo JSON directo...")

# Leer credenciales desde el archivo JSON descargado
key_path = r'c:\Users\rmend\Desktop\LAVASECO ORQUIDEAS\lavaseco-app\gcloud_key.json'

with open(key_path, 'r', encoding='utf-8') as f:
    credentials = json.load(f)

project_id = credentials['project_id']

print(f"Proyecto: {project_id}")
print("Credenciales cargadas OK")

# Intentar importar
try:
    from google.oauth2 import service_account
    from google.cloud import aiplatform
    print("Librerías importadas OK")
except Exception as e:
    print(f"ERROR al importar: {e}")
    sys.exit(1)

# Crear credenciales
try:
    creds = service_account.Credentials.from_service_account_file(key_path)
    print("Credenciales creadas OK")
except Exception as e:
    print(f"ERROR al crear credenciales: {e}")
    sys.exit(1)

# Inicializar Vertex AI
try:
    aiplatform.init(
        project=project_id,
        location='us-central1',
        credentials=creds
    )
    print("Vertex AI inicializado OK")
except Exception as e:
    error_msg = str(e)
    print(f"ERROR al inicializar Vertex AI:")
    print(f"  {error_msg}")
    
    if '403' in error_msg:
        print("\nPROBLEMA: Acceso denegado (403)")
        print("Posibles causas:")
        print("1. API de Vertex AI no habilitada")
        print("   URL: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=mystic-bank-485003-j0")
        print("2. Facturación no configurada")
        print("   URL: https://console.cloud.google.com/billing/linkedaccount?project=mystic-bank-485003-j0")
        print("3. Service Account sin permisos")
    elif '404' in error_msg:
        print("\nPROBLEMA: Recurso no encontrado (404)")
    elif 'billing' in error_msg.lower():
        print("\nPROBLEMA: Facturación no configurada")
    
    sys.exit(1)

# Intentar listar modelos
try:
    print("\nProbando listar modelos...")
    models_iter = aiplatform.Model.list()
    models = list(models_iter)[:1]  # Get first model
    print(f"✅ ÉXITO! Conexión funcionando.")
    print(f"   Modelos encontrados: {len(models)}")
    print("\n" + "="*60)
    print("✨ CONEXIÓN EXITOSA CON GOOGLE CLOUD VERTEX AI")
    print("="*60)
except Exception as e:
    print(f"ERROR al listar modelos: {e}")
    sys.exit(1)
