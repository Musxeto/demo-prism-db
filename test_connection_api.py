#!/usr/bin/env python3
"""
Test script for connection settings API endpoints
"""
import requests
import json

BASE_URL = "http://localhost:5000"

def test_connection_crud():
    """Test Create, Read, Update, Delete operations for connections"""
    
    print("🧪 Testing Connection CRUD Operations")
    print("=" * 50)
    
    # 1. Get existing connections
    print("\n1. Fetching existing connections...")
    response = requests.get(f"{BASE_URL}/api/connections")
    if response.status_code == 200:
        connections = response.json()
        print(f"✅ Found {len(connections)} existing connections")
        for conn in connections:
            print(f"   - {conn['name']} (ID: {conn['id']})")
    else:
        print(f"❌ Failed to fetch connections: {response.status_code}")
        return
    
    # 2. Create a test connection
    print("\n2. Creating a test connection...")
    test_connection = {
        "name": "Test Connection - DELETE ME",
        "host": "localhost", 
        "port": 3306,
        "database": "test_db",
        "username": "test_user",
        "password": "test_pass",
        "databaseType": "mysql",
        "isActive": True
    }
    
    response = requests.post(f"{BASE_URL}/api/connections", json=test_connection)
    if response.status_code == 200:
        new_connection = response.json()
        test_id = new_connection['id']
        print(f"✅ Created test connection with ID: {test_id}")
    else:
        print(f"❌ Failed to create connection: {response.status_code}")
        print(f"Response: {response.text}")
        return
    
    # 3. Update the connection
    print(f"\n3. Updating connection {test_id}...")
    update_data = {
        "name": "Updated Test Connection",
        "host": "updated-host",
        "port": 3307
    }
    
    response = requests.put(f"{BASE_URL}/api/connections/{test_id}", json=update_data)
    if response.status_code == 200:
        updated_connection = response.json()
        print(f"✅ Updated connection successfully")
        print(f"   New name: {updated_connection['name']}")
        print(f"   New host: {updated_connection['host']}")
        print(f"   New port: {updated_connection['port']}")
    else:
        print(f"❌ Failed to update connection: {response.status_code}")
        print(f"Response: {response.text}")
    
    # 4. Delete the connection
    print(f"\n4. Deleting connection {test_id}...")
    response = requests.delete(f"{BASE_URL}/api/connections/{test_id}")
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Deleted connection successfully")
        print(f"   Message: {result['message']}")
    else:
        print(f"❌ Failed to delete connection: {response.status_code}")
        print(f"Response: {response.text}")
    
    # 5. Verify deletion
    print(f"\n5. Verifying deletion...")
    response = requests.get(f"{BASE_URL}/api/connections")
    if response.status_code == 200:
        connections_after = response.json()
        if len(connections_after) == len(connections):
            print(f"✅ Connection successfully deleted")
            print(f"   Connections count: {len(connections_after)}")
        else:
            print(f"❌ Connection count mismatch")
    
    print("\n" + "=" * 50)
    print("🎉 Connection CRUD test completed!")

if __name__ == "__main__":
    test_connection_crud()
