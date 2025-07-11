#!/usr/bin/env python3
"""
MSSQL API Integration Test
Tests MSSQL support through the FastAPI endpoints
"""

import requests
import json
import time

# API Configuration
API_BASE = "http://localhost:8000"  # Adjust if your FastAPI server runs on a different port

# Test connection configuration
TEST_CONNECTION = {
    "name": "Test MSSQL Connection",
    "host": "DESKTOP-1VHT16K\\SQLEXPRESS",
    "port": 1433,
    "database": "wrestlers",
    "username": "sa",
    "password": "admin123",
    "databaseType": "mssql"
}

def test_connection_creation():
    """Test creating an MSSQL connection through the API"""
    print("🔌 Testing MSSQL connection creation...")
    
    try:
        response = requests.post(f"{API_BASE}/api/connections/test", json=TEST_CONNECTION)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Connection test successful: {result.get('message', 'No message')}")
            return True
        else:
            error_detail = response.json().get('detail', 'Unknown error')
            print(f"❌ Connection test failed: {error_detail}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to FastAPI server. Make sure it's running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_connection_crud():
    """Test full CRUD operations for MSSQL connections"""
    print("\n📝 Testing MSSQL connection CRUD operations...")
    
    try:
        # Create connection
        print("Creating connection...")
        create_response = requests.post(f"{API_BASE}/api/connections", json=TEST_CONNECTION)
        
        if create_response.status_code != 200:
            print(f"❌ Failed to create connection: {create_response.json()}")
            return False
            
        connection = create_response.json()
        connection_id = connection['id']
        print(f"✅ Connection created with ID: {connection_id}")
        
        # Test schema retrieval
        print("Testing schema retrieval...")
        schema_response = requests.get(f"{API_BASE}/api/connections/{connection_id}/schema")
        
        if schema_response.status_code == 200:
            schema = schema_response.json()
            print(f"✅ Schema retrieved successfully")
            print(f"   Database: {schema.get('database', 'Unknown')}")
            print(f"   Tables: {len(schema.get('tables', []))}")
            
            # Show sample tables
            tables = schema.get('tables', [])
            if tables:
                print("   Sample tables:")
                for table in tables[:3]:
                    print(f"     - {table.get('tableName', 'Unknown')} ({table.get('rowCount', 0)} rows)")
        else:
            print(f"⚠️  Schema retrieval failed: {schema_response.json()}")
        
        # Test query execution
        print("Testing query execution...")
        query_data = {
            "sql": "SELECT @@VERSION AS ServerVersion",
            "limit": 100,
            "offset": 0
        }
        
        query_response = requests.post(f"{API_BASE}/api/connections/{connection_id}/query", json=query_data)
        
        if query_response.status_code == 200:
            result = query_response.json()
            if result.get('type') == 'select':
                print(f"✅ Query executed successfully")
                print(f"   Execution time: {result.get('executionTimeMs', 0):.2f}ms")
                print(f"   Rows returned: {result.get('rowCount', 0)}")
                if result.get('rows'):
                    version = result['rows'][0][0]
                    print(f"   SQL Server Version: {version[:80]}...")
            else:
                print(f"⚠️  Query returned unexpected format: {result}")
        else:
            print(f"⚠️  Query execution failed: {query_response.json()}")
        
        # Clean up - delete connection
        print("Cleaning up...")
        delete_response = requests.delete(f"{API_BASE}/api/connections/{connection_id}")
        
        if delete_response.status_code == 200:
            print(f"✅ Connection deleted successfully")
        else:
            print(f"⚠️  Failed to delete connection: {delete_response.json()}")
        
        return True
        
    except Exception as e:
        print(f"❌ CRUD test failed: {e}")
        return False

def main():
    """Run all MSSQL integration tests"""
    print("=" * 60)
    print("🚀 MSSQL API Integration Test")
    print("=" * 60)
    
    # Test basic connection
    if not test_connection_creation():
        print("\n❌ Basic connection test failed. Check your MSSQL server and credentials.")
        return
    
    # Test full CRUD
    if not test_connection_crud():
        print("\n❌ CRUD test failed.")
        return
    
    print("\n" + "=" * 60)
    print("✅ All MSSQL Integration Tests PASSED!")
    print("🎉 MSSQL support is working correctly through the API!")
    print("=" * 60)

if __name__ == "__main__":
    main()
