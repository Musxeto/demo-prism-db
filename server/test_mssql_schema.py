#!/usr/bin/env python3
"""
Test MSSQL Schema Queries
This script tests different approaches to get schema information from SQL Server
"""

import pyodbc

def test_mssql_queries():
    # Connection string
    connection_string = (
        "DRIVER={ODBC Driver 17 for SQL Server};"
        "SERVER=DESKTOP-1VHT16K\\SQLEXPRESS;"
        "DATABASE=wrestlers;"
        "UID=sa;"
        "PWD=admin123;"
        "Trusted_Connection=no;"
    )
    
    try:
        conn = pyodbc.connect(connection_string, timeout=10)
        cursor = conn.cursor()
        
        print("✅ Connected to SQL Server")
        
        # Test 1: Get tables
        print("\n=== TEST 1: Getting Tables ===")
        try:
            cursor.execute("""
                SELECT TABLE_NAME
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_NAME
            """)
            tables = [table[0] for table in cursor.fetchall()]
            print(f"Tables found: {tables}")
        except Exception as e:
            print(f"Error getting tables: {e}")
        
        # Test 2: Check if foreign keys exist
        print("\n=== TEST 2: Checking Foreign Keys ===")
        try:
            cursor.execute("SELECT COUNT(*) FROM sys.foreign_key_columns")
            fk_count = cursor.fetchone()[0]
            print(f"Foreign key relationships found: {fk_count}")
        except Exception as e:
            print(f"Error checking foreign keys: {e}")
        
        # Test 3: Simple foreign key query
        print("\n=== TEST 3: Simple Foreign Key Query ===")
        try:
            cursor.execute("""
                SELECT 
                    OBJECT_NAME(parent_object_id) as parent_table,
                    COL_NAME(parent_object_id, parent_column_id) as parent_column,
                    OBJECT_NAME(referenced_object_id) as ref_table,
                    COL_NAME(referenced_object_id, referenced_column_id) as ref_column
                FROM sys.foreign_key_columns
            """)
            fk_results = cursor.fetchall()
            print(f"Foreign key results: {len(fk_results)} relationships")
            for fk in fk_results:
                print(f"  {fk[0]}.{fk[1]} -> {fk[2]}.{fk[3]}")
        except Exception as e:
            print(f"Error in simple FK query: {e}")
        
        # Test 4: Primary keys
        print("\n=== TEST 4: Primary Keys ===")
        try:
            cursor.execute("""
                SELECT 
                    TC.TABLE_NAME, 
                    KCU.COLUMN_NAME
                FROM 
                    INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS TC
                    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS KCU
                        ON TC.CONSTRAINT_NAME = KCU.CONSTRAINT_NAME
                WHERE 
                    TC.CONSTRAINT_TYPE = 'PRIMARY KEY'
            """)
            pk_results = cursor.fetchall()
            print(f"Primary key results: {len(pk_results)} columns")
            for pk in pk_results:
                print(f"  {pk[0]}.{pk[1]} (PK)")
        except Exception as e:
            print(f"Error in PK query: {e}")
        
        # Test 5: Get sample data
        if tables:
            print(f"\n=== TEST 5: Sample Data from {tables[0]} ===")
            try:
                cursor.execute(f"SELECT TOP 3 * FROM [{tables[0]}]")
                sample_data = cursor.fetchall()
                print(f"Sample rows: {len(sample_data)}")
                if cursor.description:
                    columns = [col[0] for col in cursor.description]
                    print(f"Columns: {columns}")
                    for row in sample_data[:2]:  # Show first 2 rows
                        print(f"  Row: {dict(zip(columns, row))}")
            except Exception as e:
                print(f"Error getting sample data: {e}")
        
        cursor.close()
        conn.close()
        print("\n✅ All tests completed")
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    test_mssql_queries()
