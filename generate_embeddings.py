import json
import os
import time
import sys
import gc
from typing import List, Dict, Any
from datetime import datetime

# Google Cloud Imports
from google.oauth2 import service_account
from google.cloud import aiplatform
from vertexai.language_models import TextEmbeddingModel

print("="*60)
print("🛡️ GENERADOR DE EMBEDDINGS (MISSION CONTROL: RESILIENT SYNC)")
print("="*60)

# Settings
KEY_PATH = r'c:\Users\rmend\Desktop\LAVASECO ORQUIDEAS\lavaseco-app\gcloud_key.json'
PROJECT_ID = "mystic-bank-485003-j0"
REGION = "us-central1"
MODEL_NAME = "text-embedding-004"
INPUT_FILE = "codebase_map.json"
OUTPUT_FILE = "codebase_embeddings.json"
LOG_FILE = "sync_log.json"

# Safety Settings
RPM_LIMIT = 50  # Requests per minute (Strict)
INTER_CHUNK_DELAY = 2.0 # Seconds between chunks
TARGET_CHUNK_SIZE = 8000 # ~2000 tokens

# ---------------------------------------------------------
# LOGGING SYSTEM
# ---------------------------------------------------------
def log_sync_event(filename: str, status: str, code: str):
    """Appends event to sync_log.json"""
    entry = {
        "file": filename,
        "status": status,
        "code": code,
        "timestamp": datetime.now().isoformat()
    }
    
    # Read existing or create new
    logs = []
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, 'r', encoding='utf-8') as f:
                logs = json.load(f)
        except:
            pass # corrupted log, start fresh
            
    logs.append(entry)
    
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(logs, f, indent=2)

# ---------------------------------------------------------
# RATE LIMITER
# ---------------------------------------------------------
class RateLimiter:
    def __init__(self, rpm):
        self.interval = 60.0 / rpm
        self.last_request_time = 0

    def wait(self):
        now = time.time()
        elapsed = now - self.last_request_time
        if elapsed < self.interval:
            sleep_time = self.interval - elapsed
            # print(f"   ⏳ Throttling: sleeping {sleep_time:.2f}s")
            time.sleep(sleep_time)
        self.last_request_time = time.time()

limiter = RateLimiter(RPM_LIMIT)

# ---------------------------------------------------------
# INIT VERTEX AI
# ---------------------------------------------------------
try:
    print(f"🔑 Cargando credenciales...")
    creds = service_account.Credentials.from_service_account_file(KEY_PATH)
    
    print(f"☁️ Inicializando Vertex AI...")
    aiplatform.init(
        project=PROJECT_ID,
        location=REGION,
        credentials=creds
    )
    
    model = TextEmbeddingModel.from_pretrained(MODEL_NAME)
    print(f"✅ Modelo cargado: {MODEL_NAME}")

except Exception as e:
    print(f"❌ Error de inicialización: {e}")
    log_sync_event("SYSTEM_INIT", "FAIL", str(e))
    sys.exit(1)

# ---------------------------------------------------------
# LOGIC
# ---------------------------------------------------------
def recursive_split_text(text: str, target_size: int = 8000) -> List[str]:
    if len(text) <= target_size:
        return [text]

    separators = ["\n\n", "\n", " "]
    for sep in separators:
        chunks = []
        current_chunk = ""
        split_parts = text.split(sep)
        
        if len(split_parts) == 1 and len(split_parts[0]) > target_size:
            continue
            
        all_good = True
        for part in split_parts:
            # Check huge indivisible parts
            if len(part) > target_size:
                # If we are at space level, we might have to force split
                if sep == " ":
                     pass 
            
            if len(current_chunk) + len(part) + len(sep) <= target_size:
                current_chunk += (sep if current_chunk else "") + part
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = part
        
        if current_chunk:
            chunks.append(current_chunk)
            
        # Validate result
        final_chunks = []
        for c in chunks:
            if len(c) > target_size:
                if sep == " ":
                    # Forced chop
                    for i in range(0, len(c), target_size):
                        final_chunks.append(c[i:i+target_size])
                else:
                    all_good = False
                    break
            else:
                final_chunks.append(c)
        
        if all_good:
            return final_chunks
            
    # Fallback
    return [text[i:i+target_size] for i in range(0, len(text), target_size)]

def get_batch_embeddings(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []

    # Retry Strategy: 1s, 4s, 10s
    delays = [1, 4, 10]
    
    for attempt, delay in enumerate(delays):
        limiter.wait() # Enforce 50 RPM limit
        
        try:
            embeddings = model.get_embeddings(texts)
            # Success
            return [emb.values for emb in embeddings]
        
        except Exception as e:
            error_str = str(e).lower()
            print(f"   ⚠️ Error attempt {attempt+1}: {e}")
            
            if "429" in error_str or "quota" in error_str:
                print(f"   ⏳ Quota hit. Waiting {delay}s...")
                time.sleep(delay)
            elif "400" in error_str:
                print(f"   ❌ Error 400 (Bad Request). Chunk likely too big.")
                # We raise to handle logic outside or just fail this batch
                raise e 
            else:
                # Other transient errors
                time.sleep(delay)
    
    print("   ❌ Failed after max retries")
    return []

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Map not found: {INPUT_FILE}")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        files_map = json.load(f)
        
    print(f"📂 Archivos a procesar: {len(files_map)}")
    
    # Clean Start preferred for "Indestructible" run, but we can append if file exists?
    # User asked for "Indestructible", implies reliability. 
    # Let's read existing to avoid duplicates if re-running.
    results = []
    processed_paths = set()
    
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                results = json.load(f)
            for item in results:
                processed_paths.add(item['full_path'])
            print(f"🔄 Reanudando. {len(processed_paths)} archivos ya parcialmente procesados.")
        except:
            print("⚠️ Output corrupt, starting fresh.")

    # Sort files for consistency
    files_to_process = [f for f in files_map if f['full_path'] not in processed_paths]
    
    # Process Loop
    # We process 1 by 1 (or small batch) to ensure granular logging
    # User said "Lotes de 25 items" for SUPABASE UPLOAD.
    # For GENERATION, we must respect RPM of 50.
    # Generating 1 embedding = 1 Request.
    # Batching 5 texts in 1 request = 1 Request.
    # So we can still batch generation to save time, but we must respect the RPM limit of requests.
    
    BATCH_SIZE = 5 
    
    current_batch_texts = []
    current_batch_meta = []
    
    total = len(files_to_process)
    
    for idx, file_item in enumerate(files_to_process):
        rel_path = file_item['rel_path']
        
        try:
            with open(file_item['full_path'], "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            
            if not content.strip():
                log_sync_event(rel_path, "EXCLUDED", "EMPTY")
                continue
                
            chunks = recursive_split_text(content, TARGET_CHUNK_SIZE)
            
            # Add chunks to batch
            for i, chunk in enumerate(chunks):
                current_batch_texts.append(chunk)
                current_batch_meta.append({
                    "id": file_item['full_path'],
                    "full_path": file_item['full_path'],
                    "project": file_item['project'],
                    "path": rel_path,
                    "content": chunk,
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                })
                
                # If batch full, execute
                if len(current_batch_texts) >= BATCH_SIZE:
                    print(f"[{idx+1}/{total}] Syncing Batch ({len(current_batch_texts)} chunks)...")
                    
                    try:
                        vectors = get_batch_embeddings(current_batch_texts)
                        if vectors:
                            for j, meta in enumerate(current_batch_meta):
                                meta['embedding'] = vectors[j]
                                results.append(meta)
                                log_sync_event(meta['path'], "SUCCESS", f"CHUNK_{meta['chunk_index']}")
                            
                            # Explicit Delay as requested "Retraso de 2 segundos entre fragmentos"
                            # This might mean between *files* or *requests*. 
                            # Adding it here is safe.
                            time.sleep(INTER_CHUNK_DELAY)
                            
                        else:
                            # Log failures
                            for meta in current_batch_meta:
                                log_sync_event(meta['path'], "FAIL", "API_ERROR_NO_VECTOR")
                                
                    except Exception as e:
                        for meta in current_batch_meta:
                            log_sync_event(meta['path'], "FAIL", str(e))
                            
                    current_batch_texts = []
                    current_batch_meta = []
                    
                    # Periodic Save
                    if len(results) % 25 == 0:
                        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                            json.dump(results, f, indent=2)

        except Exception as e:
            log_sync_event(rel_path, "FAIL", f"READ_ERROR: {e}")

    # Final Batch
    if current_batch_texts:
        try:
            vectors = get_batch_embeddings(current_batch_texts)
            if vectors:
                for j, meta in enumerate(current_batch_meta):
                    meta['embedding'] = vectors[j]
                    results.append(meta)
                    log_sync_event(meta['path'], "SUCCESS", f"CHUNK_{meta['chunk_index']}")
        except Exception as e:
             for meta in current_batch_meta:
                log_sync_event(meta['path'], "FAIL", str(e))

    # Final Save
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print("✅ Sync Complete.")

if __name__ == "__main__":
    main()
