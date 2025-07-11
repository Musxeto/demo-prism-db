#!/usr/bin/env python3
"""
Test ObjectId serialization fix
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db_connectors import create_connector
import json

def test_objectid_serialization():
    """Test that ObjectIds are properly converted to strings"""
    
    print("Testing ObjectId Serialization Fix")
    print("=" * 50)
    
    # Configuration
    config = {
        "host": "localhost",
        "port": 27017,
        "username": "master",
        "password": "admin123",
        "database": "books_library",
        "database_type": "mongodb"
    }
    
    try:
        # Create connector
        connector = create_connector(config)
        
        # Get schema
        print("Getting schema...")
        schema = connector.get_schema()
        
        if "error" in schema:
            print(f"❌ Schema error: {schema['error']}")
            return
            
        print("✅ Schema retrieved successfully!")
        
        # Try to serialize to JSON (this should work now)
        print("\nTesting JSON serialization...")
        json_str = json.dumps(schema, indent=2)
        print("✅ JSON serialization successful!")
        
        # Check if ObjectIds were converted to strings
        print("\nChecking sample data...")
        for table in schema['tables']:
            if table['sampleRows']:
                sample_row = table['sampleRows'][0]
                if '_id' in sample_row:
                    _id_value = sample_row['_id']
                    print(f"Collection: {table['tableName']}")
                    print(f"  _id type: {type(_id_value)}")
                    print(f"  _id value: {_id_value}")
                    if isinstance(_id_value, str):
                        print("  ✅ ObjectId properly converted to string")
                    else:
                        print("  ❌ ObjectId not converted")
                
        print(f"\nFound {len(schema['tables'])} collections")
        for table in schema['tables']:
            print(f"  - {table['tableName']}: {table['rowCount']} documents")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        try:
            connector.disconnect()
        except:
            pass

if __name__ == "__main__":
    test_objectid_serialization()
