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
    print("🛠️ INITIALIZING DATABASE SCHEMA")
    print("="*60)
    
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        
        # 1. Enable Vector Extension (might fail if no permissions, but usually enabled)
        print("🔌 Enabling pgvector extension...")
        try:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        except Exception as e:
            print(f"   ⚠️ Could not create extension (might already exist): {e}")
            conn.rollback()
        
        # 2. Create Table
        print("🏗️ Creating table 'codebase_embeddings'...")
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS codebase_embeddings (
          id bigint primary key generated always as identity,
          project text not null,
          file_path text not null,
          content text not null,
          embedding vector(768),
          metadata jsonb,
          created_at timestamptz default now()
        );
        """
        cursor.execute(create_table_sql)
        
        # 3. Create Index (IVFFlat)
        print("⚡ Creating index...")
        # Check if index exists or just create if not exists using duplicate safe syntax?
        # Standard SQL doesn't have CREATE INDEX IF NOT EXISTS in all versions, but PG supports it.
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS codebase_embeddings_embedding_idx 
            ON codebase_embeddings 
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
        """)
        
        conn.commit()
        print("✅ Database initialized successfully.")
        
    except Exception as e:
        print(f"❌ Error initializing DB: {e}")
        conn.rollback()
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    main()
