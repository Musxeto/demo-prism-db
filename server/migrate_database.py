"""
Database migration script to add database_type column to connections table.
"""
import sqlite3
import os

def migrate_database():
    """Add database_type column to connections table if it doesn't exist"""
    db_path = "./sql_app1.db"  # Path must match the one in database.py
    
    # Check if database file exists
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found.")
        return False
    
    try:
        # Connect to SQLite database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if database_type column exists
        cursor.execute("PRAGMA table_info(connections)")
        columns = cursor.fetchall()
        
        # Column format: (id, name, type, notnull, default_value, pk)
        column_names = [col[1] for col in columns]
        
        if "database_type" not in column_names:
            print("Adding database_type column to connections table...")
            
            # Add the column with default value 'mysql'
            cursor.execute("ALTER TABLE connections ADD COLUMN database_type TEXT DEFAULT 'mysql'")
            conn.commit()
            print("Migration successful. Added database_type column with default value 'mysql'")
        else:
            print("database_type column already exists. No migration needed.")
        
        conn.close()
        return True
    
    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
        return False

if __name__ == "__main__":
    print("Starting database migration...")
    migrate_database()
