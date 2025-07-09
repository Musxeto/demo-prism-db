"""
Test script for the enhanced SQL engine
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sql_engine import SQLQueryEngine
from schemas import QueryResult

# Test connection config (adjust these for your test database)
test_config = {
    'host': 'localhost',
    'port': 3306,
    'database': 'test_db',  # Make sure this database exists
    'user': 'root',
    'password': 'password',  # Adjust password
    'autocommit': False,
    'raise_on_warnings': True
}

def test_sql_engine():
    """Test the SQL engine with various query types"""
    
    print("🧪 Testing Enhanced SQL Engine")
    print("=" * 50)
    
    try:
        engine = SQLQueryEngine(test_config, timeout=10)
        
        # Test 1: Safe SELECT query
        print("\n📋 Test 1: Safe SELECT Query")
        result = engine.execute_query("SELECT 1 as test_column, 'Hello World' as message;")
        print(f"✅ Type: {result.type}")
        print(f"   Execution Time: {result.executionTimeMs}ms")
        print(f"   Rows: {result.rowCount}")
        
        # Test 2: Multi-statement query (with allowMultiple=True)
        print("\n📋 Test 2: Multi-Statement Query")
        multi_sql = """
        SELECT 1 as first_query;
        SELECT 2 as second_query;
        SELECT 3 as third_query;
        """
        result = engine.execute_query(multi_sql, allow_multiple=True)
        print(f"✅ Type: {result.type}")
        print(f"   Execution Time: {result.executionTimeMs}ms")
        if result.results:
            print(f"   Statements Executed: {len(result.results)}")
        
        # Test 3: Dangerous query detection
        print("\n📋 Test 3: Dangerous Query Detection")
        dangerous_sql = "DELETE FROM users;"
        result = engine.execute_query(dangerous_sql, confirm_dangerous=False)
        print(f"✅ Type: {result.type}")
        print(f"   Is Dangerous: {result.isDangerous}")
        print(f"   Message: {result.message}")
        if result.warnings:
            print(f"   Warnings: {result.warnings}")
        
        # Test 4: DDL Query (CREATE TABLE)
        print("\n📋 Test 4: DDL Query")
        ddl_sql = """
        CREATE TABLE IF NOT EXISTS test_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        result = engine.execute_query(ddl_sql)
        print(f"✅ Type: {result.type}")
        print(f"   Query Type: {result.queryType}")
        print(f"   Message: {result.message}")
        
        # Test 5: Write operation (INSERT)
        print("\n📋 Test 5: Write Operation")
        insert_sql = "INSERT INTO test_users (name, email) VALUES ('Test User', 'test@example.com');"
        result = engine.execute_query(insert_sql)
        print(f"✅ Type: {result.type}")
        print(f"   Query Type: {result.queryType}")
        print(f"   Affected Rows: {result.affectedRows}")
        print(f"   Message: {result.message}")
        
        # Test 6: SELECT with pagination
        print("\n📋 Test 6: SELECT with Pagination")
        select_sql = "SELECT * FROM test_users;"
        result = engine.execute_query(select_sql, page=1, page_size=5)
        print(f"✅ Type: {result.type}")
        print(f"   Total Rows: {result.totalRows}")
        print(f"   Page: {result.page}")
        print(f"   Page Size: {result.pageSize}")
        print(f"   Total Pages: {result.totalPages}")
        
        # Test 7: SHOW tables utility query
        print("\n📋 Test 7: Utility Query")
        show_sql = "SHOW TABLES;"
        result = engine.execute_query(show_sql)
        print(f"✅ Type: {result.type}")
        print(f"   Query Type: {result.queryType}")
        if result.rows:
            print(f"   Tables Found: {len(result.rows)}")
        
        print("\n🎉 All tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        print("\n💡 Make sure your MySQL server is running and the connection config is correct.")
        print("   You may need to:")
        print("   1. Start MySQL server")
        print("   2. Create a test database: CREATE DATABASE test_db;")
        print("   3. Update connection credentials in test_config")

if __name__ == "__main__":
    test_sql_engine()
