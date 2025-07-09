#!/usr/bin/env python3
"""
Quick database connection test script
"""
import mysql.connector
from database import get_db
from models import Connection

def test_connection():
    # Get the first connection from your app's database
    db = next(get_db())
    connection = db.query(Connection).first()
    
    if not connection:
        print("❌ No connections found in the database!")
        return
    
    print(f"Testing connection: {connection.name}")
    print(f"Host: {connection.host}")
    print(f"Database: {connection.database}")
    print(f"Username: {connection.username}")
    
    try:
        # Connect to MySQL
        mydb = mysql.connector.connect(
            host=connection.host,
            user=connection.username,
            password=connection.password,
            database=connection.database
        )
        cursor = mydb.cursor()
        
        # Test basic queries
        print("✅ Connection successful!")
        
        # Check current database
        cursor.execute("SELECT DATABASE()")
        current_db = cursor.fetchone()[0]
        print(f"Current database: {current_db}")
        
        # Show existing tables
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"Existing tables: {[t[0] for t in tables]}")
        
        # Test creating a simple table
        test_table_sql = """
        CREATE TABLE IF NOT EXISTS test_connection_table (
            id INT AUTO_INCREMENT PRIMARY KEY,
            test_field VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
        
        print("\n🧪 Testing table creation...")
        cursor.execute(test_table_sql)
        mydb.commit()
        print("✅ Test table creation executed")
        
        # Verify table was created
        cursor.execute("SHOW TABLES LIKE 'test_connection_table'")
        result = cursor.fetchall()
        if result:
            print("✅ Test table successfully created!")
            
            # Clean up
            cursor.execute("DROP TABLE test_connection_table")
            mydb.commit()
            print("✅ Test table cleaned up")
        else:
            print("❌ Test table was NOT created!")
        
        mydb.close()
        
    except mysql.connector.Error as err:
        print(f"❌ MySQL Error: {err}")
        print(f"Error code: {err.errno}")
        print(f"SQL state: {err.sqlstate}")
    except Exception as e:
        print(f"❌ General error: {e}")

if __name__ == "__main__":
    test_connection()
