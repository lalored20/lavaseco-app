import json
import os

MAP_FILE = "codebase_map.json"
RESULTS_FILE = "codebase_embeddings.json"

def main():
    print("="*60)
    print("🕵️ AUDITORIA DE OMISIONES")
    print("="*60)
    
    if not os.path.exists(MAP_FILE) or not os.path.exists(RESULTS_FILE):
        print("❌ Archivos de datos no encontrados.")
        return

    # Load All Expected
    with open(MAP_FILE, 'r', encoding='utf-8') as f:
        all_files = json.load(f)
    
    # Load Processed
    with open(RESULTS_FILE, 'r', encoding='utf-8') as f:
        processed_data = json.load(f)
        
    # Set of processed full_paths
    processed_paths = set()
    for item in processed_data:
        p = item.get('full_path') or item.get('id')
        if p:
            processed_paths.add(p)
            
    # Calculate Missing
    missing = []
    
    projects_stats = {}
    
    for f in all_files:
        proj = f['project']
        if proj not in projects_stats:
            projects_stats[proj] = {"total": 0, "missing": 0}
        
        projects_stats[proj]["total"] += 1
        
        if f['full_path'] not in processed_paths:
            missing.append(f)
            projects_stats[proj]["missing"] += 1

    # Report
    print(f"📉 Total Archivos Esperados: {len(all_files)}")
    print(f"📈 Total Procesados (Embeddings): {len(processed_paths)} (archivos únicos)")
    print(f"🚫 Total Omisiones: {len(missing)}")
    print("-" * 30)
    
    for proj, stats in projects_stats.items():
        print(f"   📂 {proj}: {stats['total'] - stats['missing']}/{stats['total']} (Faltan {stats['missing']})")
        
    print("-" * 30)
    if missing:
        print("📝 Lista de Omisiones (Primeros 10):")
        for m in missing[:10]:
            print(f"   - {m['rel_path']}")
        
        if len(missing) > 10:
            print(f"   ... y {len(missing) - 10} más.")
            
    # Save Omissions to file for "listing exactly"
    with open("omissions_report.json", "w", encoding="utf-8") as f:
        json.dump(missing, f, indent=2)
    print("\n💾 Reporte detallado guardado en 'omissions_report.json'")

if __name__ == "__main__":
    main()
