"""
Test PostgreSQL Connection 

This script tests the PostgreSQL connector implementation.
"""

from db_connectors import create_connector

def test_postgres_connection():
    """Test PostgreSQL connection and query execution"""
    # Configuration for PostgreSQL - update with your test database info
    config = {
        "host": "localhost",
        "port": 5432,
        "database": "postgres",  # Default database
        "username": "postgres",  # Default user
        "password": "postgres",  # Default password - update this
        "database_type": "postgres"
    }
    
    try:
        print("Creating PostgreSQL connector...")
        connector = create_connector(config)
        
        print("Testing connection...")
        success, message = connector.test_connection()
        print(f"Connection test result: {success}, message: {message}")
        
        if success:
            print("Connection successful! Testing schema retrieval...")
            schema = connector.get_schema()
            print(f"Found {len(schema['tables'])} tables in database {schema['database']}")
            
            if schema['tables']:
                # Print first table details
                table = schema['tables'][0]
                print(f"First table: {table['tableName']} with {table['rowCount']} rows")
                print(f"Columns: {[col['name'] for col in table['columns']]}")
                
                # Test query execution
                print("Testing query execution...")
                query = f"SELECT * FROM \"{table['tableName']}\" LIMIT 5"
                result = connector.execute_query(query)
                
                if result['type'] == 'select':
                    print(f"Query successful! Retrieved {len(result['rows'])} rows")
                    print(f"Columns: {[col['name'] for col in result['columns']]}")
                else:
                    print(f"Query returned with type {result['type']}: {result['message']}")
            
            # Disconnect when done
            connector.disconnect()
            print("Test completed successfully")
        
    except Exception as e:
        print(f"Error testing PostgreSQL connection: {str(e)}")

if __name__ == "__main__":
    test_postgres_connection()
