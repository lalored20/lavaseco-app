import json
import os
import time
import sys
from typing import List, Dict, Any

try:
    import psycopg2
    from psycopg2.extras import execute_values
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False
    print("⚠️ psycopg2 not found. Install it for faster direct DB access: pip install psycopg2-binary")

# Configuration from .env
ENV_PATH = r'c:\Users\rmend\Desktop\LAVASECO ORQUIDEAS\lavaseco-app\.env'

def load_env(path: str) -> Dict[str, str]:
    env = {}
    if os.path.exists(path):
        with open(path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    return env

config = load_env(ENV_PATH)
DB_URL = config.get('DATABASE_URL')
EMBEDDINGS_FILE = 'codebase_embeddings.json'
BATCH_SIZE = 25  # Reduced from 100 to 25 per user request

def connect_db():
    if not HAS_PSYCOPG2:
        return None
    try:
        return psycopg2.connect(DB_URL)
    except Exception as e:
        print(f"❌ DB Connection failed: {e}")
        return None

def main():
    print("="*60)
    print("💾 UPLOAD EMBEDDINGS TO SUPABASE (Optimized Batch: 25)")
    print("="*60)

    if not os.path.exists(EMBEDDINGS_FILE):
        print(f"❌ File not found: {EMBEDDINGS_FILE}")
        return

    # 1. Connect
    conn = connect_db()
    if not conn:
        print("❌ Could not connect to database via psycopg2. Aborting.")
        sys.exit(1)

    cursor = conn.cursor()

    # 2. Load Data
    with open(EMBEDDINGS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"📂 Loaded {len(data)} chunk embeddings from file.")

    try:
        # 3. Truncate (Clean Slate required for integrity)
        print("🧹 Cleaning existing memory (TRUNCATE TABLE codebase_embeddings)...")
        cursor.execute("TRUNCATE TABLE codebase_embeddings;")
        conn.commit()

        # 4. Batch Insert
        print("🚀 Inserting data...")
        
        insert_query = """
            INSERT INTO codebase_embeddings (project, file_path, content, embedding, metadata)
            VALUES %s
        """
        
        # Prepare data for execute_values
        values = []
        for item in data:
            # Metadata upgrade: include chunk info if present
            meta_dict = {"source": "batch_upload", "original_id": item.get('id')}
            if 'chunk_index' in item:
                meta_dict.update({
                    "chunk_index": item['chunk_index'],
                    "total_chunks": item.get('total_chunks')
                })
                
            meta = json.dumps(meta_dict)
            
            # Ensure embedding is a list of floats
            emb = item.get('embedding', [])
            if not emb:
                continue

            values.append((
                item.get('project', 'unknown'),
                item.get('path', item.get('rel_path', 'unknown')),
                item.get('content', ''), # Insert the actual chunk content
                emb, 
                meta
            ))

        total = len(values)
        start_time = time.time()
        
        for i in range(0, total, BATCH_SIZE):
            batch = values[i:i + BATCH_SIZE]
            execute_values(cursor, insert_query, batch)
            conn.commit()
            print(f"   Processed {min(i + BATCH_SIZE, total)}/{total} rows...", end='\r')
        
        print(f"\n✅ Upload completed in {time.time() - start_time:.2f} seconds.")

    except Exception as e:
        print(f"\n❌ Error during upload: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
