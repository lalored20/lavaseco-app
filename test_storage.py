import json
import sys
from google.oauth2 import service_account
from google.cloud import storage

print("\n" + "="*60)
print("📦 TESTING GOOGLE CLOUD STORAGE ACCESS")
print("="*60)

# Settings
key_path = r'c:\Users\rmend\Desktop\LAVASECO ORQUIDEAS\lavaseco-app\gcloud_key.json'
project_id = "mystic-bank-485003-j0"

try:
    # 1. Load Credentials
    print(f"Loading credentials from: {key_path}")
    creds = service_account.Credentials.from_service_account_file(key_path)
    print("✅ Credentials object created")

    # 2. Init Storage Client
    print("\nInitializing Storage Client...")
    storage_client = storage.Client(credentials=creds, project=project_id)
    print("✅ Client initialized")

    # 3. List Buckets
    print("\nListing buckets (Access Test)...")
    buckets = list(storage_client.list_buckets())
    
    print(f"✅ Success! Found {len(buckets)} buckets.")
    for bucket in buckets:
        print(f"   - {bucket.name}")

    print("\n✨ STORAGE AUTHENTICATION WORKS PERFECTLY")
    print("   This confirms your Service Account Key is VALID.")

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print("\nDiagnostic:")
    if "403" in str(e):
        print("   -> Permission Denied. Service Account might lack 'Storage Admin' or 'Viewer' role.")
    elif "401" in str(e):
        print("   -> Authentication Failed. Key might be invalid or clock skew issue.")
    else:
        print("   -> Unknown error. Check network/firewall.")
    
    sys.exit(1)
