#!/usr/bin/env python3
"""
Simple test script to verify MongoDB connection functionality
"""

from db_connectors import create_connector

def test_mongodb_connection():
    """Test MongoDB connection with the connector"""
    print("Testing MongoDB Connection...")
    
    # Configuration for local MongoDB (adjust as needed)
    config = {
        "host": "localhost",
        "port": 27017,
        "database": "test",
        "username": "",  # Leave empty for no auth
        "password": "",  # Leave empty for no auth
        "database_type": "mongodb"
    }
    
    try:
        # Create MongoDB connector
        connector = create_connector(config)
        print("✓ MongoDB connector created successfully")
        
        # Test connection
        success, message = connector.test_connection()
        print(f"Connection test: {message}")
        
        if success:
            print("✓ MongoDB connection successful!")
            
            # Try to get schema
            schema = connector.get_schema()
            print(f"✓ Schema retrieved: {schema.get('database')} with {len(schema.get('tables', []))} collections")
            
            # List collections found
            for table in schema.get('tables', []):
                table_name = table.get('tableName', 'unknown')
                row_count = table.get('rowCount', 0)
                column_count = len(table.get('columns', []))
                print(f"  - Collection: {table_name} ({row_count} documents, {column_count} fields)")
        
        else:
            print(f"✗ MongoDB connection failed: {message}")
            
        # Cleanup
        connector.disconnect()
        print("✓ Connection closed")
        
    except Exception as e:
        print(f"✗ Error testing MongoDB: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_mongodb_connection()
