#!/usr/bin/env python3
import json
import sys

print("Iniciando diagnóstico...")

# Leer credenciales
settings_path = r'C:\Users\rmend\AppData\Roaming\Antigravity\User\settings.json'

with open(settings_path, 'r', encoding='utf-8') as f:
    settings = json.load(f)

credentials = settings['antigravity.googleCloud.serviceAccountKey']
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
    creds = service_account.Credentials.from_service_account_info(credentials)
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
        print("2. Facturación no configurada")
        print("3. Service Account sin permisos")
    elif '404' in error_msg:
        print("\nPROBLEMA: Recurso no encontrado (404)")
    elif 'billing' in error_msg.lower():
        print("\nPROBLEMA: Facturación no configurada")
    
    sys.exit(1)

# Intentar listar modelos
try:
    print("\nProbando listar modelos...")
    models = list(aiplatform.Model.list(limit=1))
    print(f"✅ ÉXITO! Conexión funcionando. Modelos encontrados: {len(models)}")
except Exception as e:
    print(f"ERROR al listar modelos: {e}")
    sys.exit(1)
