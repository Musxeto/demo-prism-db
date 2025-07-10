"""
Database migration script to add database_type column to connections table
"""
import sqlite3
import os
from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL

def migrate_database():
    """
    Add database_type column to connections table if it doesn't exist
    """
    print("Starting database migration...")
    
    # Check if the database file exists
    db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        return
    
    # Connect to the SQLite database
    try:
        # Using direct sqlite3 connection
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if database_type column exists in connections table
        cursor.execute("PRAGMA table_info(connections)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        if "database_type" not in column_names:
            print("Adding database_type column to connections table...")
            cursor.execute("ALTER TABLE connections ADD COLUMN database_type TEXT DEFAULT 'mysql'")
            conn.commit()
            print("Migration complete: database_type column added with default value 'mysql'")
        else:
            print("database_type column already exists, no migration needed")
            
        conn.close()
        
        # Also try using SQLAlchemy to verify
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        with engine.connect() as connection:
            result = connection.execute(text("SELECT * FROM connections LIMIT 1"))
            print("Connection table columns:", result.keys())
        
        print("Migration completed successfully")
        
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        raise

if __name__ == "__main__":
    migrate_database()
