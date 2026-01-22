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
    print("🛠️ CREATING SEARCH FUNCTION")
    print("="*60)
    
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        
        print("⚡ Creating function 'match_codebase'...")
        # Use existing SQL
        func_sql = """
            create or replace function match_codebase (
              query_embedding vector(768),
              match_threshold float,
              match_count int
            )
            returns table (
              id bigint,
              project text,
              file_path text,
              content text,
              similarity float
            )
            language plpgsql
            as $$
            begin
              return query
              select
                codebase_embeddings.id,
                codebase_embeddings.project,
                codebase_embeddings.file_path,
                codebase_embeddings.content,
                1 - (codebase_embeddings.embedding <=> query_embedding) as similarity
              from codebase_embeddings
              where 1 - (codebase_embeddings.embedding <=> query_embedding) > match_threshold
              order by codebase_embeddings.embedding <=> query_embedding
              limit match_count;
            end;
            $$;
        """
        cursor.execute(func_sql)
        conn.commit()
        print("✅ Function created successfully.")
        
    except Exception as e:
        print(f"❌ Error creating function: {e}")
        conn.rollback()
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    main()
