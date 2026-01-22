import os
import psycopg2
import json

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
    print("🧠 PROOF OF CONSCIOUSNESS: 360 INTEGRATION")
    print("="*60)
    
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()

    # We need to generate embeddings for the questions to query the DB.
    # Since we can't easily call Vertex here without importing the heavy lib again,
    # we will rely on a "keyword" search fallback if vector search isn't easily mockable,
    # OR better: use the 'match_codebase' function if we had the vector.
    
    # Wait! The user asked ME to answer. The script should help ME answer.
    # But to be "agentic", the script should demonstrate the system finding the answer.
    # I can try to use the `generate_embeddings.py` module to get the vector for the query!
    
    try:
        from generate_embeddings import model
        print("💡 Generating query vectors...")
        
        questions = [
            "Donde se define la estructura de los pedidos (Order) en Lavaseco?",
            "Que componente de hydra-web visualiza o interactua con pedidos?"
        ]
        
        embeddings = model.get_embeddings(questions)
        
        for i, q in enumerate(questions):
            print(f"\n❓ PREGUNTA: {q}")
            vector = embeddings[i].values
            
            cursor.execute("""
                select project, file_path, content, similarity 
                from match_codebase(%s::vector, 0.5, 3)
            """, (vector,))
            
            results = cursor.fetchall()
            if not results:
                 print("   ❌ No direct matches found (>0.5 similarity).")
            
            for r in results:
                project = r[0]
                path = r[1]
                sim = r[3]
                print(f"   👉 Match ({sim:.4f}) [{project}]: {path}")
                # print snippet
                content = r[2][:200].replace('\n', ' ')
                print(f"      Context: {content}...")

    except ImportError:
        print("⚠️ Could not import generation model. Ensure generate_embeddings.py is in the same folder.")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
