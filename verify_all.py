import os
import psycopg2

# Configuration from .env
ENV_PATH = r'c:\Users\rmend\Desktop\LAVASECO ORQUIDEAS\lavaseco-app\.env'

def load_env(path: str):
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

def main():
    print("="*60)
    print("🕵️ VERIFICATION REPORT")
    print("="*60)
    
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        
        # 1. Count Total Nodes
        cursor.execute("SELECT count(*) FROM codebase_embeddings;")
        count = cursor.fetchone()[0]
        print(f"🧠 Total Memory Nodes: {count}")
        
        # 2. Test Vector Search (RPC)
        # We need a dummy embedding. Using a zero vector or random for test if psql allows.
        # But we can't easily generate embedding here without numpy/vertex.
        # However, we can call the function with a dummy list if pgvector casts it.
        # '[0.1, 0.1, ...]' string literal to vector.
        
        print("🔍 Testing Semantic Search (RPC match_codebase)...")
        dummy_vector = '[' + ','.join(['0.01'] * 768) + ']'
        
        try:
            cursor.execute("""
                select * from match_codebase(
                    %s::vector, 
                    0.0, 
                    3
                );
            """, (dummy_vector,))
            results = cursor.fetchall()
            print(f"✅ Search successful. Found {len(results)} matches.")
            for r in results:
                print(f"   - {r[2]} (sim: {r[4]:.4f})")
        except Exception as e:
            print(f"❌ Search failed: {e}")
            
    except Exception as e:
        print(f"❌ Verification failed: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    main()
