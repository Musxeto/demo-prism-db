import os
import re
import glob

def remove_comments_from_file(file_path):
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content

        _, ext = os.path.splitext(file_path)
        
        if ext in ['.py']:
            
            content = re.sub(r'
            
            content = re.sub(r'', '', content)
            content = re.sub(r"", '', content)
            
        elif ext in ['.ts', '.tsx', '.js', '.jsx']:
            
            content = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
            
            content = re.sub(r'/\*[\s\S]*?\*/', '', content)

        content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        content = re.sub(r'^\s*\n', '', content)

        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Processed: {os.path.basename(file_path)}")
            return True
        else:
            print(f"⏭️  No changes: {os.path.basename(file_path)}")
            return False
            
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return False

def main():
    base_path = r"d:\Abdullah Files\Downloads\MySqlReactFastApi\MySqlReactFastApi"

    patterns = [
        "**/*.py",
        "**/*.ts", 
        "**/*.tsx",
        "**/*.js",
        "**/*.jsx"
    ]

    exclude_dirs = {
        'node_modules', '__pycache__', '.git', 'dist', 'build', 
        '.vscode', '.next', 'coverage', '.pytest_cache'
    }
    
    processed_count = 0
    
    for pattern in patterns:
        full_pattern = os.path.join(base_path, pattern)
        for file_path in glob.glob(full_pattern, recursive=True):
            
            if any(excluded_dir in file_path for excluded_dir in exclude_dirs):
                continue
                
            if remove_comments_from_file(file_path):
                processed_count += 1
    
    print(f"\n🎉 Completed! Processed {processed_count} files.")

if __name__ == "__main__":
    main()
