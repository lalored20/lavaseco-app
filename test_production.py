"""
🧪 SCRIPT DE PRUEBAS DE ESTRÉS INTEGRAL
Prueba el despliegue de Cloud Run de forma exhaustiva
"""

import requests
import time
import sys
from datetime import datetime

# Configurar URL base (se actualizará después del despliegue)
BASE_URL = input("Ingresa la URL de Cloud Run (ej: https://lavaseco-app-xxxxx-uc.a.run.app): ").strip()

if not BASE_URL:
    print("❌ Error: URL no proporcionada")
    sys.exit(1)

print("\n" + "="*60)
print("🧪 PRUEBAS DE ESTRÉS INTEGRAL - CLOUD RUN")
print("="*60)
print(f"🌐 URL: {BASE_URL}")
print(f"⏰ Inicio: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("="*60 + "\n")

def test_health_check():
    """Verificar que el servicio responde"""
    print("1️⃣  Test: Health Check")
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        duration = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Status: {data.get('status')}")
            print(f"   ✅ Database: {data.get('database')}")
            print(f"   ✅ Environment: {data.get('environment')}")
            print(f"   ⏱️  Response time: {duration:.2f}s")
            return True
        else:
            print(f"   ❌ Failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_cold_start():
    """Medir tiempo de cold start"""
    print("\n2️⃣  Test: Cold Start Performance")
    try:
        # Esperar 60 segundos para asegurar cold start
        print("   ⏳ Esperando 60s para cold start...")
        time.sleep(60)
        
        start = time.time()
        response = requests.get(f"{BASE_URL}/", timeout=30)
        duration = time.time() - start
        
        if response.status_code == 200:
            print(f"   ✅ Cold start: {duration:.2f}s")
            if duration < 5:
                print("   🎉 Excelente rendimiento!")
            elif duration < 10:
                print("   ⚠️  Rendimiento aceptable")
            else:
                print("   ⚠️  Cold start lento, considera min-instances=1")
            return True
        else:
            print(f"   ❌ Failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_warm_requests():
    """Probar rendimiento con instancia caliente"""
    print("\n3️⃣  Test: Warm Request Performance")
    times = []
    
    for i in range(5):
        try:
            start = time.time()
            response = requests.get(f"{BASE_URL}/api/health", timeout=10)
            duration = time.time() - start
            times.append(duration)
            
            if response.status_code == 200:
                print(f"   Request {i+1}/5: {duration:.2f}s ✅")
            else:
                print(f"   Request {i+1}/5: Failed ❌")
        except Exception as e:
            print(f"   Request {i+1}/5: Error - {e} ❌")
    
    if times:
        avg = sum(times) / len(times)
        print(f"\n   📊 Promedio: {avg:.2f}s")
        print(f"   📊 Mínimo: {min(times):.2f}s")
        print(f"   📊 Máximo: {max(times):.2f}s")
        return True
    return False

def test_database_connection():
    """Verificar conexión persistente a Supabase"""
    print("\n4️⃣  Test: Database Connection Persistence")
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('database') == 'connected':
                print("   ✅ Conexión a Supabase: Estable")
                return True
            else:
                print("   ❌ Conexión a Supabase: Fallida")
                print(f"   Error: {data.get('error')}")
                return False
        else:
            print(f"   ❌ Failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_concurrent_requests():
    """Probar manejo de múltiples requests concurrentes"""
    print("\n5️⃣  Test: Concurrent Request Handling")
    import concurrent.futures
    
    def make_request(i):
        try:
            start = time.time()
            response = requests.get(f"{BASE_URL}/api/health", timeout=10)
            duration = time.time() - start
            return (i, response.status_code, duration)
        except Exception as e:
            return (i, 0, 0)
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_request, i) for i in range(10)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    
    success = sum(1 for _, status, _ in results if status == 200)
    avg_time = sum(duration for _, _, duration in results if duration > 0) / len(results)
    
    print(f"   ✅ Exitosas: {success}/10")
    print(f"   ⏱️  Tiempo promedio: {avg_time:.2f}s")
    
    return success >= 8

# Ejecutar todas las pruebas
print("\n🚀 Iniciando batería de pruebas...\n")

results = {
    "Health Check": test_health_check(),
    "Cold Start": test_cold_start(),
    "Warm Requests": test_warm_requests(),
    "Database Connection": test_database_connection(),
    "Concurrent Requests": test_concurrent_requests()
}

# Resumen final
print("\n" + "="*60)
print("📊 RESUMEN DE PRUEBAS")
print("="*60)

for test_name, passed in results.items():
    status = "✅ PASSED" if passed else "❌ FAILED"
    print(f"{test_name}: {status}")

total = len(results)
passed = sum(results.values())
percentage = (passed / total) * 100

print("="*60)
print(f"🎯 Resultado: {passed}/{total} pruebas exitosas ({percentage:.0f}%)")

if percentage == 100:
    print("🎉 ¡INTEGRIDAD EN LA NUBE: 100%!")
elif percentage >= 80:
    print("⚠️  Integridad parcial. Revisar pruebas fallidas.")
else:
    print("❌ Integridad comprometida. Requiere intervención.")

print("="*60)
print(f"⏰ Fin: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("="*60)

sys.exit(0 if percentage == 100 else 1)
