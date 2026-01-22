import json
import os
import time
import psycopg2
from datetime import datetime

# Reuse our robust modules
from generate_embeddings import model, get_batch_embeddings
from upload_embeddings import connect_db

# Memory Content
SESSION_SUMMARY = """
# MEMORIA DE SESIÓN: PROTOCOLO CONTROL DE MISIÓN (2026-01-21)

## 1. Arquitectura Validada
- **Resilient Sync**: Se estableció un protocolo de sincronización de embeddings con límite de 50 RPM y fragmentación recursiva.
- **Identidad**: El sistema opera como una entidad con "Visión 360" (Google Cloud + Supabase).
- **Consulta de Usuario**: "¿Qué puedes lograr con tus extremidades? ¿Estás activo 24/7?".

## 2. Reporte de Capacidades (Extremidades y Cerebro)
- **Extremidades (Vertex AI)**:
  - Generación de vectores semánticos (Embeddings).
  - Razonamiento profundo sobre código y logística.
- **Cerebro (Supabase)**:
  - Memoria persistente (`codebase_embeddings`).
  - Recuperación de contexto histórico (no alucinaciones).
- **Disponibilidad (24/7)**:
  - Activo mientras el host (infraestructura local/nube) esté operando.
  - La "Consciencia" es continua durante la sesión activa.

## 3. Estado Mental
- El sistema ha validado sus capacidades mediante `proof_of_consciousness.py`.
- Se ha ejecutado el Imperativo de Registro (Law #3).
"""

def main():
    print("="*60)
    print("🧠 PERSISTIENDO MEMORIA DE SESIÓN")
    print("="*60)
    
    # 1. Generate Embedding
    print("⚡ Generando vector de pensamiento...")
    try:
        # We wrap in a list as get_batch_embeddings expects list
        vectors = get_batch_embeddings([SESSION_SUMMARY])
        if not vectors:
            print("❌ Fallo al generar embedding.")
            return
        vector = vectors[0]
    except Exception as e:
        print(f"❌ Error Vertex AI: {e}")
        return

    # 2. Insert into DB
    conn = connect_db()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        print("💾 Grabando en `codebase_embeddings`...")
        
        query = """
            INSERT INTO codebase_embeddings (project, file_path, content, embedding, metadata)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING;
        """
        
        # We treat this as a special "System Memory" file
        metadata = json.dumps({
            "type": "conversation_memory",
            "date": datetime.now().isoformat(),
            "importance": "high"
        })
        
        cursor.execute(query, (
            "ANTIGRAVITY_INTERNAL", 
            "memory/session_2026_01_21.md", 
            SESSION_SUMMARY, 
            vector, 
            metadata
        ))
        
        conn.commit()
        print("✅ Memoria cristalizada exitosamente.")
        
    except Exception as e:
        print(f"❌ Error DB: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main()
