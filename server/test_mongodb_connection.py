"""
MongoDB Connection Test Script
This script tests connecting to a MongoDB database and performing basic operations.
"""

import sys
import os
import json
from pymongo import MongoClient
from bson import ObjectId

# Add the parent directory to the path to import the connector
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db_connectors import MongoDBConnector

def test_direct_connection():
    """Test direct connection using pymongo"""
    print("Testing direct MongoDB connection...")
    
    try:
        # Try to connect to MongoDB (default local settings)
        client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=5000)
        
        # Force a connection by issuing a command
        client.admin.command('ping')
        
        print("✅ Direct connection successful")
        
        # List databases
        databases = client.list_database_names()
        print(f"Available databases: {', '.join(databases)}")
        
        # Close the connection
        client.close()
        
    except Exception as e:
        print(f"❌ Direct connection failed: {e}")

def test_connector():
    """Test MongoDB connection using our connector class"""
    print("\nTesting MongoDB connector...")
    
    # Configuration matching the expected structure
    config = {
        "host": "localhost",
        "port": 27017,
        "database": "test",  # Use 'test' or any existing database
        "username": "",      # Empty if no auth required
        "password": "",      # Empty if no auth required
        "database_type": "mongodb"
    }
    
    try:
        # Create connector
        connector = MongoDBConnector(config)
        
        # Test connection
        success, message = connector.test_connection()
        
        if success:
            print(f"✅ Connector test successful: {message}")
            
            # Connect and get database
            db = connector.connect()
            
            # Test query execution - list collections
            query = "db.runCommand({listCollections: 1})"
            result = connector.execute_query(query)
            
            print("\nTest query result:")
            print(json.dumps(result, indent=2, default=str))
            
            # Get schema information
            schema = connector.get_schema()
            print("\nSchema information:")
            print(f"Database: {schema['database']}")
            print(f"Collections: {len(schema['tables'])}")
            
            for table in schema['tables']:
                print(f"  - {table['tableName']} ({table['rowCount']} documents)")
            
        else:
            print(f"❌ Connector test failed: {message}")
            
    except Exception as e:
        print(f"❌ Connector test exception: {e}")

if __name__ == "__main__":
    test_direct_connection()
    test_connector()
