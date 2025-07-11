#!/usr/bin/env python3
"""
Enhanced MSSQL Connection Test Script
Tests the MSSQLConnector with multiple driver detection and comprehensive error reporting
"""

import sys
import os

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    import pyodbc
    print("✅ pyodbc is available")
except ImportError:
    print("❌ pyodbc is not installed. Please install it with: pip install pyodbc")
    sys.exit(1)

try:
    from db_connectors import MSSQLConnector
    print("✅ MSSQLConnector imported successfully")
except ImportError as e:
    print(f"❌ Failed to import MSSQLConnector: {e}")
    sys.exit(1)

def test_mssql_connection():
    """Test MSSQL connection using the MSSQLConnector class"""
    
    # Test configuration (from your working connection_test_mssql.py)
    config = {
        'host': r'DESKTOP-1VHT16K\SQLEXPRESS',
        'port': 1433,  # Standard MSSQL port (though not used for named instances)
        'database': 'wrestlers',
        'username': 'sa',
        'password': 'admin123'
    }
    
    print("\n🔍 Checking available ODBC drivers...")
    available_drivers = MSSQLConnector.get_available_drivers()
    if available_drivers:
        print(f"Available SQL Server drivers: {available_drivers}")
    else:
        print("❌ No SQL Server ODBC drivers found on system")
        print("Please install ODBC Driver 17+ for SQL Server")
        return False
    
    print(f"\n🔌 Testing connection to: {config['host']}")
    print(f"   Database: {config['database']}")
    print(f"   Username: {config['username']}")
    
    try:
        # Create connector instance
        connector = MSSQLConnector(config)
        
        # Test connection
        print("\n🧪 Testing connection...")
        success, message = connector.test_connection()
        
        if success:
            print(f"✅ Connection test successful: {message}")
            
            # Try to get schema information
            print("\n📋 Testing schema retrieval...")
            try:
                schema = connector.get_schema()
                print(f"✅ Schema retrieved successfully")
                print(f"   Database: {schema['database']}")
                print(f"   Tables found: {len(schema['tables'])}")
                
                # Show first few tables
                if schema['tables']:
                    print("   Sample tables:")
                    for table in schema['tables'][:3]:
                        print(f"     - {table['tableName']} ({table['rowCount']} rows, {len(table['columns'])} columns)")
                
            except Exception as e:
                print(f"⚠️  Schema retrieval failed: {e}")
            
            # Try a simple query
            print("\n🔍 Testing query execution...")
            try:
                result = connector.execute_query("SELECT @@VERSION AS ServerVersion")
                if result.get('type') == 'select' and result.get('rows'):
                    version_info = result['rows'][0][0]
                    print(f"✅ Query executed successfully")
                    print(f"   SQL Server Version: {version_info[:100]}...")
                else:
                    print(f"⚠️  Query returned unexpected format: {result}")
            except Exception as e:
                print(f"⚠️  Query execution failed: {e}")
            
        else:
            print(f"❌ Connection test failed: {message}")
            return False
            
    except Exception as e:
        print(f"❌ Connection setup failed: {e}")
        return False
    
    finally:
        # Clean up
        try:
            connector.disconnect()
            print("\n🔌 Connection closed")
        except:
            pass
    
    return success

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Enhanced MSSQL Connection Test")
    print("=" * 60)
    
    success = test_mssql_connection()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ MSSQL Connection Test PASSED")
        print("🎉 MSSQL support is working correctly!")
    else:
        print("❌ MSSQL Connection Test FAILED")
        print("🔧 Please check your ODBC driver installation and connection settings")
    print("=" * 60)
