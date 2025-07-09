#!/usr/bin/env python3
"""
Quick test script to validate pagination with 10 rows per page
"""

import requests
import json
import time

def test_pagination():
    """Test pagination functionality with the query API"""
    
    base_url = "http://localhost:8000"
    
    # Test connection ID (assuming we have a test connection)
    connection_id = 1
    
    print("🧪 Testing SQL Pagination (10 rows per page)")
    print("=" * 50)
    
    # Test 1: Create test data
    print("\n1️⃣ Creating test data...")
    
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS pagination_test (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        value INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """
    
    response = requests.post(f"{base_url}/api/connections/{connection_id}/query", json={
        "sql": create_table_sql,
        "page": 1,
        "pageSize": 10
    })
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Table creation: {result['type']} - {result.get('message', 'Success')}")
    else:
        print(f"❌ Failed to create table: {response.status_code}")
        return
    
    # Test 2: Insert 25 rows for pagination testing
    print("\n2️⃣ Inserting 25 test rows...")
    
    insert_sql = """
    INSERT INTO pagination_test (name, value) VALUES 
    ('Row 1', 1), ('Row 2', 2), ('Row 3', 3), ('Row 4', 4), ('Row 5', 5),
    ('Row 6', 6), ('Row 7', 7), ('Row 8', 8), ('Row 9', 9), ('Row 10', 10),
    ('Row 11', 11), ('Row 12', 12), ('Row 13', 13), ('Row 14', 14), ('Row 15', 15),
    ('Row 16', 16), ('Row 17', 17), ('Row 18', 18), ('Row 19', 19), ('Row 20', 20),
    ('Row 21', 21), ('Row 22', 22), ('Row 23', 23), ('Row 24', 24), ('Row 25', 25)
    """
    
    response = requests.post(f"{base_url}/api/connections/{connection_id}/query", json={
        "sql": insert_sql,
        "page": 1,
        "pageSize": 10
    })
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Data insertion: {result['type']} - {result.get('affectedRows', 0)} rows affected")
    else:
        print(f"❌ Failed to insert data: {response.status_code}")
        return
    
    # Test 3: Test pagination - Page 1
    print("\n3️⃣ Testing Page 1 (rows 1-10)...")
    
    select_sql = "SELECT * FROM pagination_test ORDER BY id"
    
    response = requests.post(f"{base_url}/api/connections/{connection_id}/query", json={
        "sql": select_sql,
        "page": 1,
        "pageSize": 10
    })
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Page 1 Results:")
        print(f"   📄 Page: {result.get('page', 'N/A')}")
        print(f"   📊 Total Pages: {result.get('totalPages', 'N/A')}")
        print(f"   📈 Rows on Page: {result.get('rowCount', 'N/A')}")
        print(f"   📋 Total Rows: {result.get('totalRows', 'N/A')}")
        if result.get('rows'):
            print(f"   🔢 First Row ID: {result['rows'][0][0]}")
            print(f"   🔢 Last Row ID: {result['rows'][-1][0]}")
    else:
        print(f"❌ Failed to get page 1: {response.status_code}")
        return
    
    # Test 4: Test pagination - Page 2
    print("\n4️⃣ Testing Page 2 (rows 11-20)...")
    
    response = requests.post(f"{base_url}/api/connections/{connection_id}/query", json={
        "sql": select_sql,
        "page": 2,
        "pageSize": 10
    })
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Page 2 Results:")
        print(f"   📄 Page: {result.get('page', 'N/A')}")
        print(f"   📊 Total Pages: {result.get('totalPages', 'N/A')}")
        print(f"   📈 Rows on Page: {result.get('rowCount', 'N/A')}")
        if result.get('rows'):
            print(f"   🔢 First Row ID: {result['rows'][0][0]}")
            print(f"   🔢 Last Row ID: {result['rows'][-1][0]}")
    else:
        print(f"❌ Failed to get page 2: {response.status_code}")
        return
    
    # Test 5: Test pagination - Page 3 (partial)
    print("\n5️⃣ Testing Page 3 (rows 21-25)...")
    
    response = requests.post(f"{base_url}/api/connections/{connection_id}/query", json={
        "sql": select_sql,
        "page": 3,
        "pageSize": 10
    })
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Page 3 Results:")
        print(f"   📄 Page: {result.get('page', 'N/A')}")
        print(f"   📊 Total Pages: {result.get('totalPages', 'N/A')}")
        print(f"   📈 Rows on Page: {result.get('rowCount', 'N/A')}")
        if result.get('rows'):
            print(f"   🔢 First Row ID: {result['rows'][0][0]}")
            print(f"   🔢 Last Row ID: {result['rows'][-1][0]}")
    else:
        print(f"❌ Failed to get page 3: {response.status_code}")
    
    # Test 6: Cleanup
    print("\n6️⃣ Cleaning up test data...")
    
    cleanup_sql = "DROP TABLE IF EXISTS pagination_test"
    
    response = requests.post(f"{base_url}/api/connections/{connection_id}/query", json={
        "sql": cleanup_sql,
        "page": 1,
        "pageSize": 10
    })
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Cleanup: {result['type']} - {result.get('message', 'Success')}")
    else:
        print(f"❌ Failed to cleanup: {response.status_code}")
    
    print("\n🎉 Pagination testing completed!")
    print("📋 Summary: Should show 3 pages with 10, 10, and 5 rows respectively")

if __name__ == "__main__":
    try:
        test_pagination()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Cannot connect to backend server. Make sure it's running on localhost:8000")
    except Exception as e:
        print(f"❌ Error: {e}")
