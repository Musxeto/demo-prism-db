#!/usr/bin/env python3
"""
Test the MSSQLConnector directly
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db_connectors import MSSQLConnector

def test_mssql_connector():
    config = {
        'database_type': 'mssql',
        'host': 'DESKTOP-1VHT16K\\SQLEXPRESS',
        'port': 1433,
        'database': 'wrestlers',
        'username': 'sa',
        'password': 'admin123'
    }
    
    print("Testing MSSQLConnector...")
    
    try:
        connector = MSSQLConnector(config)
        
        # Test connection
        print("\n=== Testing Connection ===")
        success, message = connector.test_connection()
        print(f"Connection test: {success} - {message}")
        
        if success:
            # Test schema
            print("\n=== Testing Schema ===")
            schema = connector.get_schema()
            print(f"Schema retrieved successfully!")
            print(f"Database: {schema['database']}")
            print(f"Tables found: {len(schema['tables'])}")
            
            for table in schema['tables']:
                print(f"\nTable: {table['tableName']} ({table['rowCount']} rows)")
                print(f"  Columns: {len(table['columns'])}")
                
                # Show foreign keys
                fk_columns = [col for col in table['columns'] if col['isForeignKey']]
                if fk_columns:
                    print(f"  Foreign Keys:")
                    for fk_col in fk_columns:
                        ref = fk_col['references']
                        print(f"    {fk_col['name']} -> {ref['table']}.{ref['column']}")
                
                # Show primary keys
                pk_columns = [col for col in table['columns'] if col['isPrimaryKey']]
                if pk_columns:
                    pk_names = [col['name'] for col in pk_columns]
                    print(f"  Primary Keys: {', '.join(pk_names)}")
        
        connector.disconnect()
        print("\n✅ Test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_mssql_connector()
