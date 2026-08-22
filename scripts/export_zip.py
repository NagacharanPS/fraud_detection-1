import os
import zipfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
ZIP_OUT_PATH = BASE_DIR / "upi_payguard_project.zip"

EXCLUDE_DIRS = {"node_modules", ".git", "dist", "__pycache__", ".vite", ".cache"}
EXCLUDE_FILES = {"upi_payguard_project.zip"}

def create_project_zip():
    print(f"--- Packaging project into {ZIP_OUT_PATH.name} ---")
    
    with zipfile.ZipFile(ZIP_OUT_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(BASE_DIR):
            # Exclude unwanted directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            for file in files:
                if file in EXCLUDE_FILES or file.endswith('.pyc'):
                    continue
                file_path = Path(root) / file
                arcname = file_path.relative_to(BASE_DIR)
                zipf.write(file_path, arcname)

    size_mb = ZIP_OUT_PATH.stat().st_size / (1024 * 1024)
    print(f"Project ZIP created successfully: {size_mb:.2f} MB")
    return ZIP_OUT_PATH

if __name__ == "__main__":
    create_project_zip()
