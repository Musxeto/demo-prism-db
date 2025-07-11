#!/usr/bin/env python3
"""
Test the updated MongoDB connector
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db_connectors import create_connector

def test_updated_connector():
    """Test the updated MongoDB connector with automatic auth source detection"""
    
    print("Testing Updated MongoDB Connector")
    print("=" * 50)
    
    # Configuration that matches what your app sends
    config = {
        "host": "localhost",
        "port": 27017,
        "username": "master",
        "password": "admin123",
        "database": "books_library",
        "database_type": "mongodb"
    }
    
    print(f"Config: {config}")
    print("-" * 30)
    
    try:
        # Create connector
        print("Creating MongoDB connector...")
        connector = create_connector(config)
        
        # Test connection
        print("Testing connection...")
        success, message = connector.test_connection()
        print(f"Test result: {success}")
        print(f"Message: {message}")
        
        if success:
            print("\n✅ Connection test successful!")
            
            # Test schema retrieval
            print("\nTesting schema retrieval...")
            schema = connector.get_schema()
            
            if "error" in schema:
                print(f"❌ Schema error: {schema['error']}")
            else:
                print(f"✅ Schema retrieved successfully!")
                print(f"Database: {schema['database']}")
                print(f"Collections: {len(schema['tables'])}")
                for table in schema['tables']:
                    print(f"  - {table['tableName']} ({table['rowCount']} documents)")
                    
            # Test a simple query
            print("\nTesting query execution...")
            query_result = connector.execute_query("db.books.find({}).limit(3)")
            
            if query_result["type"] == "error":
                print(f"❌ Query error: {query_result['message']}")
            else:
                print(f"✅ Query executed successfully!")
                print(f"Result type: {query_result['type']}")
                print(f"Row count: {query_result['rowCount']}")
                print(f"Columns: {[col['name'] for col in query_result['columns']]}")
                
        else:
            print(f"❌ Connection test failed: {message}")
            
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up
        try:
            connector.disconnect()
        except:
            pass

if __name__ == "__main__":
    test_updated_connector()
