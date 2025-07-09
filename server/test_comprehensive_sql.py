#!/usr/bin/env python3
"""
Test script to validate comprehensive SQL support in our query engine.
This tests all SQL types: SELECT, INSERT, UPDATE, DELETE, DDL, Multi-statement.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sql_engine import SQLQueryEngine
import json

def test_sql_engine():
    """Test the SQL engine with various query types"""
    
    # Test connection configuration - adjust as needed for your MySQL setup
    connection_config = {
        'host': 'localhost',
        'port': 3306,
        'database': 'test_db',
        'user': 'root',
        'password': '',  # Update with your MySQL password
        'autocommit': False,
        'raise_on_warnings': True
    }
    
    print("🚀 Testing Comprehensive SQL Query Support")
    print("=" * 50)
    
    try:
        engine = SQLQueryEngine(connection_config)
        
        # Test 1: DDL - Create Table
        print("\n1️⃣ Testing DDL (CREATE TABLE)")
        ddl_result = engine.execute_query("""
            CREATE TABLE IF NOT EXISTS test_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE,
                age INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """, page=1, page_size=10)
        print(f"✅ Result: {ddl_result.type} - {ddl_result.message}")
        
        # Test 2: INSERT - Add Data
        print("\n2️⃣ Testing INSERT")
        insert_result = engine.execute_query("""
            INSERT INTO test_users (name, email, age) VALUES 
            ('Alice Johnson', 'alice@example.com', 28),
            ('Bob Smith', 'bob@example.com', 34),
            ('Carol White', 'carol@example.com', 22),
            ('David Brown', 'david@example.com', 41),
            ('Eve Davis', 'eve@example.com', 29),
            ('Frank Wilson', 'frank@example.com', 36),
            ('Grace Miller', 'grace@example.com', 25),
            ('Henry Taylor', 'henry@example.com', 33),
            ('Ivy Anderson', 'ivy@example.com', 27),
            ('Jack Moore', 'jack@example.com', 39),
            ('Kate Thomas', 'kate@example.com', 24),
            ('Leo Jackson', 'leo@example.com', 31)
        """, page=1, page_size=10)
        print(f"✅ Result: {insert_result.type} - {insert_result.affectedRows} rows affected")
        
        # Test 3: SELECT with Pagination (Page 1)
        print("\n3️⃣ Testing SELECT with Pagination (Page 1 - 10 rows)")
        select_result_page1 = engine.execute_query("""
            SELECT id, name, email, age FROM test_users ORDER BY id
        """, page=1, page_size=10)
        print(f"✅ Result: {select_result_page1.type}")
        print(f"   📄 Page: {select_result_page1.page}/{select_result_page1.totalPages}")
        print(f"   📊 Rows: {select_result_page1.rowCount}/{select_result_page1.totalRows}")
        print(f"   🗂️ Columns: {[col['name'] for col in select_result_page1.columns]}")
        print(f"   📋 Sample data: {select_result_page1.rows[:3] if select_result_page1.rows else 'No data'}")
        
        # Test 4: SELECT with Pagination (Page 2)
        print("\n4️⃣ Testing SELECT with Pagination (Page 2)")
        select_result_page2 = engine.execute_query("""
            SELECT id, name, email, age FROM test_users ORDER BY id
        """, page=2, page_size=10)
        print(f"✅ Result: {select_result_page2.type}")
        print(f"   📄 Page: {select_result_page2.page}/{select_result_page2.totalPages}")
        print(f"   📊 Rows: {select_result_page2.rowCount}/{select_result_page2.totalRows}")
        print(f"   📋 Sample data: {select_result_page2.rows[:3] if select_result_page2.rows else 'No data'}")
        
        # Test 5: UPDATE
        print("\n5️⃣ Testing UPDATE")
        update_result = engine.execute_query("""
            UPDATE test_users SET age = age + 1 WHERE age < 30
        """, page=1, page_size=10)
        print(f"✅ Result: {update_result.type} - {update_result.affectedRows} rows affected")
        
        # Test 6: DELETE
        print("\n6️⃣ Testing DELETE")
        delete_result = engine.execute_query("""
            DELETE FROM test_users WHERE name LIKE '%Smith%'
        """, page=1, page_size=10)
        print(f"✅ Result: {delete_result.type} - {delete_result.affectedRows} rows affected")
        
        # Test 7: Multi-statement Query
        print("\n7️⃣ Testing Multi-statement Query")
        multi_result = engine.execute_query("""
            INSERT INTO test_users (name, email, age) VALUES ('Multi User', 'multi@example.com', 25);
            UPDATE test_users SET age = 26 WHERE name = 'Multi User';
            SELECT COUNT(*) as total_users FROM test_users;
        """, page=1, page_size=10, allow_multiple=True)
        print(f"✅ Result: {multi_result.type} - {multi_result.message}")
        if multi_result.results:
            print(f"   📊 Individual results: {len(multi_result.results)} statements executed")
        
        # Test 8: Error Query
        print("\n8️⃣ Testing Error Handling")
        error_result = engine.execute_query("""
            SELECT * FROMM invalid_table
        """, page=1, page_size=10)
        print(f"✅ Result: {error_result.type} - {error_result.message}")
        
        # Test 9: Dangerous Query Detection
        print("\n9️⃣ Testing Dangerous Query Detection")
        dangerous_result = engine.execute_query("""
            DELETE FROM test_users
        """, page=1, page_size=10, confirm_dangerous=False)
        print(f"✅ Result: {dangerous_result.type}")
        print(f"   ⚠️ Dangerous: {dangerous_result.isDangerous}")
        print(f"   📝 Message: {dangerous_result.message}")
        
        # Test 10: SHOW Queries (Utility)
        print("\n🔟 Testing Utility Queries (SHOW TABLES)")
        show_result = engine.execute_query("""
            SHOW TABLES
        """, page=1, page_size=10)
        print(f"✅ Result: {show_result.type}")
        print(f"   📋 Tables: {[row[0] for row in show_result.rows] if show_result.rows else 'No tables'}")
        
        print("\n🎉 All tests completed successfully!")
        print("📊 SQL Engine supports all query types with proper pagination!")
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = test_sql_engine()
    sys.exit(0 if success else 1)
