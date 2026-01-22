import time
import email.utils
import urllib.request
from datetime import datetime

print("="*60)
print("⏳ VERIFICADOR DE SINCRONIZACIÓN TEMPORAL (TIME SKEW)")
print("="*60)

try:
    # 1. Obtener la "Hora Local" (User's 2026 reality)
    local_time = datetime.now()
    print(f"\n🏠 TU HORA LOCAL (PC):")
    print(f"   {local_time}")

    # 2. Obtener la "Hora Google" (Server Time)
    print(f"\n☁️ CONSULTANDO HORA DE GOOGLE...")
    with urllib.request.urlopen("http://www.google.com") as response:
        server_date_str = response.headers['Date']
        # Parse RFC 2822 date
        server_time_tuple = email.utils.parsedate(server_date_str)
        server_time = datetime.fromtimestamp(time.mktime(server_time_tuple))
        
    print(f"   {server_time} (Aprox)")

    # 3. Calcular Diferencia
    diff = local_time - server_time
    days = diff.days
    
    print("\n" + "-"*60)
    print(f"📉 DESFASE DETECTADO: {days} días")
    print("-" * 60)
    
    if abs(days) > 1:
        print("\n✅ CONCLUSIÓN:")
        print("   Google vive en el PASADO (relative to you).")
        print("   Para conectarnos, debemos firmar las credenciales con")
        print("   fecha del 'pasado' para que Google las acepte.")
        print(f"   -> Necesitamos restar {days} días a los tokens.")
    else:
        print("\n✅ CONCLUSIÓN: El tiempo está sincronizado.")

except Exception as e:
    print(f"❌ Error al comprobar el tiempo: {e}")
