import urllib.request

print("="*60)
print("📅 VERIFICADOR DE FECHA CRUDA (RAW HEADER)")
print("="*60)

try:
    with urllib.request.urlopen("http://www.google.com") as response:
        raw_date = response.headers['Date']
        print(f"\n📨 Raw Date Header from Google:")
        print(f"   '{raw_date}'")

except Exception as e:
    print(f"❌ Error: {e}")
