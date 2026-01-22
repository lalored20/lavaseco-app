import os
import json

# Configuration
DIRECTORIES_TO_SCAN = [
    r"c:\Users\rmend\Desktop\LAVASECO ORQUIDEAS\lavaseco-app",
    r"c:\Users\rmend\Desktop\ESTEROIDES DE ANTIGRAVITY\06_01_2026_FRONTEND\hydra-web"
]

EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.py', '.md', '.prisma'}

IGNORE_DIRS = {
    'node_modules', '.git', '.next', 'dist', 'build', 'coverage', 
    '__pycache__', '.vscode', '.idea', 'public', '.venv'
}

def scan_directory(root_path):
    found_files = []
    print(f"Scanning: {root_path}...")
    
    if not os.path.exists(root_path):
        print(f"⚠️ Warning: Path not found: {root_path}")
        return []

    for root, dirs, files in os.walk(root_path):
        # Modify dirs in-place to skip ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in EXTENSIONS:
                full_path = os.path.join(root, file)
                # Store relative path for readability, but keep full path for processing
                rel_path = os.path.relpath(full_path, root_path)
                found_files.append({
                    "full_path": full_path,
                    "rel_path": rel_path,
                    "project": os.path.basename(root_path),
                    "ext": ext
                })
                
    return found_files

def main():
    print("="*60)
    print("🔍 CODEBASE SCANNER FOR GRAPHRAG")
    print("="*60)
    
    all_files = []
    for directory in DIRECTORIES_TO_SCAN:
        files = scan_directory(directory)
        all_files.extend(files)
        print(f"   -> Found {len(files)} files in {os.path.basename(directory)}")

    output_file = "codebase_map.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_files, f, indent=2)

    print("\n" + "="*60)
    print(f"✅ SCAN COMPLETE. Found {len(all_files)} total files.")
    print(f"📄 Map saved to: {output_file}")
    print("="*60)

if __name__ == "__main__":
    main()
