#!/usr/bin/env python3
"""
Script para habilitar las APIs necesarias de Google Cloud
"""
import subprocess
import sys

print("="*60)
print("🔧 HABILITANDO APIS DE GOOGLE CLOUD")
print("="*60)
print()

project_id = "mystic-bank-485003-j0"

# Lista de APIs necesarias
apis = [
    ("aiplatform.googleapis.com", "Vertex AI API"),
    ("storage.googleapis.com", "Cloud Storage API"),
    ("compute.googleapis.com", "Compute Engine API"),
]

print(f"Proyecto: {project_id}")
print()

# Configurar el proyecto
print("📌 Configurando proyecto...")
try:
    subprocess.run(
        ["gcloud", "config", "set", "project", project_id],
        check=True,
        capture_output=True
    )
    print("✅ Proyecto configurado")
except subprocess.CalledProcessError as e:
    print(f"❌ ERROR: gcloud no está instalado o configurado")
    print("\n💡 SOLUCIÓN MANUAL:")
    print(f"   1. Ve a: https://console.cloud.google.com/apis/library?project={project_id}")
    print("   2. Busca y habilita:")
    for api_name, api_desc in apis:
        print(f"      - {api_desc}")
    sys.exit(1)

print()

# Habilitar cada API
for api_name, api_desc in apis:
    print(f"🔌 Habilitando {api_desc}...")
    try:
        result = subprocess.run(
            ["gcloud", "services", "enable", api_name, "--project", project_id],
            check=True,
            capture_output=True,
            text=True
        )
        print(f"   ✅ {api_desc} habilitada")
    except subprocess.CalledProcessError as e:
        print(f"   ⚠️  Error al habilitar {api_desc}")
        print(f"   Detalles: {e.stderr}")

print()
print("="*60)
print("✨ PROCESO COMPLETADO")
print("="*60)
print()
print("Espera 1-2 minutos para que las APIs se activen completamente")
print("Luego ejecuta: python test_gcloud.py")
