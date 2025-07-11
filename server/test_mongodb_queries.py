#!/usr/bin/env python3
"""
Test MongoDB query execution functionality
"""

from db_connectors import create_connector

def test_mongodb_queries():
    """Test MongoDB query execution"""
    print("Testing MongoDB Query Execution...")
    
    # Configuration for local MongoDB
    config = {
        "host": "localhost",
        "port": 27017,
        "database": "test",
        "username": "",
        "password": "",
        "database_type": "mongodb"
    }
    
    try:
        connector = create_connector(config)
        print("✓ MongoDB connector created")
        
        # Test different types of queries
        test_queries = [
            "db.users.find({})",
            "db.products.find({\"price\": {\"$gt\": 100}})",
            "db.orders.find({\"status\": \"shipped\"})"
        ]
        
        for query in test_queries:
            print(f"\nTesting query: {query}")
            try:
                result = connector.execute_query(query)
                print(f"✓ Query executed successfully")
                print(f"  Type: {result.get('type')}")
                print(f"  Execution time: {result.get('executionTimeMs', 0):.2f}ms")
                
                if result.get('type') == 'select':
                    print(f"  Columns: {len(result.get('columns', []))}")
                    print(f"  Rows: {len(result.get('rows', []))}")
                elif result.get('type') == 'error':
                    print(f"  Error: {result.get('message')}")
                    
            except Exception as e:
                print(f"✗ Query failed: {str(e)}")
        
        connector.disconnect()
        print("\n✓ All tests completed")
        
    except Exception as e:
        print(f"✗ Error in test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_mongodb_queries()
