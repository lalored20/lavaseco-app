import time
import datetime
import sys

print("="*60)
print("🕒 APLICANDO PARCHE TEMPORAL (-10 MINUTOS)")
print("="*60)

# 1. Monkey Patch time.time to be 10 minutes in the past
real_time = time.time
def mocked_time():
    return real_time() - 600  # Subtract 600 seconds (10 minutes)

time.time = mocked_time
print(f"✅ Parche aplicado: Ahora tu PC 'cree' que es 10 minutos antes.")

# ---------------------------------------------------------
# IMPORTANTE: Importar google libraries DESPUÉS del parche
# ---------------------------------------------------------
from google.oauth2 import service_account
from google.cloud import aiplatform

# Settings
permission_key_path = r'c:\Users\rmend\Desktop\LAVASECO ORQUIDEAS\lavaseco-app\gcloud_key.json'
project_id = "mystic-bank-485003-j0"

try:
    print(f"\nGenerando credenciales con hora ajustada...")
    creds = service_account.Credentials.from_service_account_file(permission_key_path)

    print("Inicializando Vertex AI...")
    aiplatform.init(
        project=project_id,
        location='us-central1',
        credentials=creds
    )
    
    print("\nProbando conexión...")
    # List models
    models_iter = aiplatform.Model.list()
    # Try to consume the iterator to trigger the API call
    models = list(models_iter)[:1]
    
    print("\n" + "="*60)
    print("✨ ¡CONEXIÓN EXITOSA!")
    print("✨ El parche de tiempo funcionó.")
    print("="*60)

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    if "401" in str(e):
        print("   -> Sigue fallando la autenticación.")
