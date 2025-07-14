"""
Multi-Database Connector Module
Handles connections to different database types:
- MySQL
- PostgreSQL
- Microsoft SQL Server
- SQLite
- MongoDB
"""

from abc import ABC, abstractmethod
import mysql.connector
import sqlite3
import json
import re
from typing import Dict, Any, List, Optional, Union, Tuple

# For PostgreSQL and MSSQL support
try:
    import psycopg2  # PostgreSQL
except ImportError:
    psycopg2 = None

try:
    import pyodbc  # MSSQL via ODBC
except ImportError:
    pyodbc = None

try:
    import pymongo  # MongoDB
    from bson import ObjectId
except ImportError:
    pymongo = None
    ObjectId = None

class DatabaseConnector(ABC):
    """Abstract base class for all database connectors"""
    
    @abstractmethod
    def connect(self) -> Any:
        """Establish connection to the database"""
        pass
    
    @abstractmethod
    def disconnect(self) -> None:
        """Close the database connection"""
        pass
    
    @abstractmethod
    def test_connection(self) -> Tuple[bool, str]:
        """Test if the connection can be established
        Returns: (success: bool, message: str)
        """
        pass
    
    @abstractmethod
    def execute_query(self, sql: str) -> Dict[str, Any]:
        """Execute SQL query and return results"""
        pass
    
    @abstractmethod
    def get_schema(self) -> Dict[str, Any]:
        """Get database schema information"""
        pass
    
    @abstractmethod
    def get_table_info(self, table_name: str) -> Dict[str, Any]:
        """Get detailed information about a specific table"""
        pass

class MySQLConnector(DatabaseConnector):
    """MySQL database connector implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize with connection config
        
        Args:
            config: Dict with host, port, database, username, password
        """
        self.config = config
        self.connection = None
        self.cursor = None
    
    def connect(self) -> mysql.connector.connection.MySQLConnection:
        """Connect to MySQL database"""
        if self.connection and self.connection.is_connected():
            return self.connection
            
        try:
            self.connection = mysql.connector.connect(
                host=self.config["host"],
                port=self.config["port"],
                user=self.config["username"],
                password=self.config["password"],
                database=self.config["database"]
            )
            return self.connection
        except mysql.connector.Error as err:
            raise ConnectionError(f"Failed to connect to MySQL: {err}")
    
    def disconnect(self) -> None:
        """Close MySQL connection"""
        if self.connection and self.connection.is_connected():
            if self.cursor:
                self.cursor.close()
            self.connection.close()
            self.connection = None
            self.cursor = None
    
    def test_connection(self) -> Tuple[bool, str]:
        """Test MySQL connection"""
        try:
            conn = mysql.connector.connect(
                host=self.config["host"],
                port=self.config["port"],
                user=self.config["username"],
                password=self.config["password"],
                database=self.config["database"],
                connection_timeout=5  # Short timeout for testing
            )
            if conn.is_connected():
                conn.close()
                return True, "Connection successful"
            return False, "Could not establish connection"
        except mysql.connector.Error as err:
            return False, f"Connection failed: {str(err)}"
    
    def _map_mysql_type(self, type_code) -> str:
        """Map MySQL type codes to string representation"""
        # Import FieldType from mysql.connector
        try:
            from mysql.connector import FieldType
            mysql_type_mapping = {
                FieldType.DECIMAL: "DECIMAL",
                FieldType.TINY: "TINYINT",
                FieldType.SHORT: "SMALLINT", 
                FieldType.LONG: "INT",
                FieldType.FLOAT: "FLOAT",
                FieldType.DOUBLE: "DOUBLE",
                FieldType.NULL: "NULL",
                FieldType.TIMESTAMP: "TIMESTAMP",
                FieldType.LONGLONG: "BIGINT",
                FieldType.INT24: "MEDIUMINT",
                FieldType.DATE: "DATE",
                FieldType.TIME: "TIME",
                FieldType.DATETIME: "DATETIME",
                FieldType.YEAR: "YEAR",
                FieldType.NEWDATE: "DATE",
                FieldType.VARCHAR: "VARCHAR",
                FieldType.BIT: "BIT",
                FieldType.JSON: "JSON",
                FieldType.NEWDECIMAL: "DECIMAL",
                FieldType.ENUM: "ENUM",
                FieldType.SET: "SET",
                FieldType.TINY_BLOB: "TINYBLOB",
                FieldType.MEDIUM_BLOB: "MEDIUMBLOB",
                FieldType.LONG_BLOB: "LONGBLOB",
                FieldType.BLOB: "BLOB",
                FieldType.VAR_STRING: "VARCHAR",
                FieldType.STRING: "CHAR",
                FieldType.GEOMETRY: "GEOMETRY"
            }
            return mysql_type_mapping.get(type_code, f"VARCHAR")
        except ImportError:
            # If FieldType is not available, try to infer from the type object
            if hasattr(type_code, '__name__'):
                type_name = type_code.__name__
                python_to_mysql = {
                    'int': 'INT',
                    'float': 'DOUBLE',
                    'str': 'VARCHAR',
                    'bytes': 'BLOB',
                    'datetime': 'DATETIME',
                    'date': 'DATE',
                    'time': 'TIME',
                    'bool': 'BOOLEAN',
                    'Decimal': 'DECIMAL'
                }
                return python_to_mysql.get(type_name, 'VARCHAR')
            return str(type_code)

    def execute_query(self, sql: str) -> Dict[str, Any]:
        """Execute SQL query on MySQL"""
        start_time = __import__('time').time()
        result = {
            "type": "error",
            "message": "",
            "executionTimeMs": 0
        }
        
        try:
            conn = self.connect()
            cursor = conn.cursor(dictionary=True)
            
            # Determine if this is a SELECT query or a different type
            is_select = sql.strip().upper().startswith("SELECT")
            
            cursor.execute(sql)
            
            if is_select:
                rows = cursor.fetchall()
                columns = cursor.description
                result.update({
                    "type": "select",
                    "columns": [{"name": col[0], "type": self._map_mysql_type(col[1])} for col in columns],
                    "rows": [[cell for cell in row.values()] for row in rows],
                    "rowCount": len(rows),
                })
            else:
                conn.commit()
                result.update({
                    "type": "write",
                    "affectedRows": cursor.rowcount,
                    "message": f"{cursor.rowcount} row(s) affected"
                })
                
            result["executionTimeMs"] = (__import__('time').time() - start_time) * 1000
            cursor.close()
            return result
            
        except mysql.connector.Error as err:
            result.update({
                "message": str(err),
                "executionTimeMs": (__import__('time').time() - start_time) * 1000
            })
            return result
        
    def get_schema(self) -> Dict[str, Any]:
        """Get MySQL database schema"""
        conn = self.connect()
        cursor = conn.cursor(dictionary=True)
        
        try:
            # Get all tables
            cursor.execute("SHOW TABLES")
            tables = [table[f"Tables_in_{self.config['database']}"] for table in cursor.fetchall()]
            
            result = {
                "database": self.config["database"],
                "tables": []
            }
            
            for table in tables:
                # Get table structure
                cursor.execute(f"DESCRIBE `{table}`")
                columns = cursor.fetchall()
                
                # Get sample rows
                cursor.execute(f"SELECT * FROM `{table}` LIMIT 5")
                sample_rows = cursor.fetchall()
                
                # Get row count
                cursor.execute(f"SELECT COUNT(*) as count FROM `{table}`")
                row_count = cursor.fetchone()["count"]
                
                table_info = {
                    "tableName": table,
                    "rowCount": row_count,
                    "columns": [
                        {
                            "name": col["Field"],
                            "type": col["Type"],
                            "nullable": col["Null"] == "YES",
                            "isPrimaryKey": col["Key"] == "PRI",
                            "isForeignKey": col["Key"] == "MUL",
                            "references": None  # To be filled later
                        }
                        for col in columns
                    ],
                    "sampleRows": sample_rows
                }
                
                result["tables"].append(table_info)
            
            return result
            
        finally:
            cursor.close()
    
    def get_table_info(self, table_name: str) -> Dict[str, Any]:
        """Get detailed information about a specific MySQL table"""
        conn = self.connect()
        cursor = conn.cursor(dictionary=True)
        
        try:
            # Get table structure
            cursor.execute(f"DESCRIBE `{table_name}`")
            columns = cursor.fetchall()
            
            # Get foreign keys
            cursor.execute(f"""
                SELECT 
                    COLUMN_NAME, 
                    REFERENCED_TABLE_NAME, 
                    REFERENCED_COLUMN_NAME 
                FROM 
                    INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE 
                    TABLE_SCHEMA = '{self.config['database']}' AND 
                    TABLE_NAME = '{table_name}' AND 
                    REFERENCED_TABLE_NAME IS NOT NULL
            """)
            foreign_keys = cursor.fetchall()
            
            # Create a mapping of column name to its foreign key reference
            fk_mapping = {}
            for fk in foreign_keys:
                fk_mapping[fk["COLUMN_NAME"]] = {
                    "table": fk["REFERENCED_TABLE_NAME"],
                    "column": fk["REFERENCED_COLUMN_NAME"]
                }
            
            # Get sample rows
            cursor.execute(f"SELECT * FROM `{table_name}` LIMIT 5")
            sample_rows = cursor.fetchall()
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) as count FROM `{table_name}`")
            row_count = cursor.fetchone()["count"]
            
            return {
                "tableName": table_name,
                "rowCount": row_count,
                "columns": [
                    {
                        "name": col["Field"],
                        "type": col["Type"],
                        "nullable": col["Null"] == "YES",
                        "isPrimaryKey": col["Key"] == "PRI",
                        "isForeignKey": col["Key"] == "MUL",
                        "references": fk_mapping.get(col["Field"])
                    }
                    for col in columns
                ],
                "sampleRows": sample_rows
            }
            
        finally:
            cursor.close()

class SQLiteConnector(DatabaseConnector):
    """SQLite database connector implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize with connection config
        
        Args:
            config: Dict with database (file path)
        """
        self.config = config
        self.connection = None
        self.cursor = None
    
    def connect(self) -> sqlite3.Connection:
        """Connect to SQLite database"""
        if self.connection:
            return self.connection
            
        try:
            self.connection = sqlite3.connect(self.config["database"])
            self.connection.row_factory = sqlite3.Row
            return self.connection
        except sqlite3.Error as err:
            raise ConnectionError(f"Failed to connect to SQLite: {err}")
    
    def disconnect(self) -> None:
        """Close SQLite connection"""
        if self.connection:
            if self.cursor:
                self.cursor.close()
            self.connection.close()
            self.connection = None
            self.cursor = None
    
    def test_connection(self) -> Tuple[bool, str]:
        """Test SQLite connection"""
        try:
            conn = sqlite3.connect(self.config["database"])
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            conn.close()
            return True, "Connection successful"
        except sqlite3.Error as err:
            return False, f"Connection failed: {str(err)}"
    
    def execute_query(self, sql: str) -> Dict[str, Any]:
        """Execute SQL query on SQLite"""
        start_time = __import__('time').time()
        result = {
            "type": "error",
            "message": "",
            "executionTimeMs": 0
        }
        
        try:
            conn = self.connect()
            cursor = conn.cursor()
            
            # Determine if this is a SELECT query or a different type
            is_select = sql.strip().upper().startswith("SELECT")
            
            cursor.execute(sql)
            
            if is_select:
                rows = cursor.fetchall()
                # Get column names from cursor description
                columns = cursor.description
                
                result.update({
                    "type": "select",
                    "columns": [{"name": col[0], "type": "TEXT"} for col in columns],  # SQLite doesn't provide detailed type info
                    "rows": [[row[i] for i in range(len(row))] for row in rows],
                    "rowCount": len(rows),
                })
            else:
                conn.commit()
                result.update({
                    "type": "write",
                    "affectedRows": cursor.rowcount if cursor.rowcount > 0 else 0,
                    "message": f"{cursor.rowcount if cursor.rowcount > 0 else 0} row(s) affected"
                })
                
            result["executionTimeMs"] = (__import__('time').time() - start_time) * 1000
            cursor.close()
            return result
            
        except sqlite3.Error as err:
            result.update({
                "message": str(err),
                "executionTimeMs": (__import__('time').time() - start_time) * 1000
            })
            return result
        
    def get_schema(self) -> Dict[str, Any]:
        """Get SQLite database schema"""
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            # Get all tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            tables = [table[0] for table in cursor.fetchall()]
            
            result = {
                "database": self.config["database"].split("/")[-1],  # Just the filename
                "tables": []
            }
            
            for table in tables:
                # Get table structure
                cursor.execute(f"PRAGMA table_info(`{table}`)")
                columns_info = cursor.fetchall()
                
                # Get foreign keys
                cursor.execute(f"PRAGMA foreign_key_list(`{table}`)")
                foreign_keys = cursor.fetchall()
                
                # Create a mapping of column index to its foreign key reference
                fk_mapping = {}
                for fk in foreign_keys:
                    fk_mapping[fk[3]] = {
                        "table": fk[2],
                        "column": fk[4]
                    }
                
                # Get sample rows
                cursor.execute(f"SELECT * FROM `{table}` LIMIT 5")
                sample_rows = []
                for row in cursor.fetchall():
                    sample_rows.append({cursor.description[i][0]: row[i] for i in range(len(row))})
                
                # Get row count
                cursor.execute(f"SELECT COUNT(*) as count FROM `{table}`")
                row_count = cursor.fetchone()[0]
                
                columns = []
                for col in columns_info:
                    col_index = col[0]
                    col_name = col[1]
                    col_type = col[2]
                    col_notnull = col[3]
                    col_pk = col[5]
                    
                    columns.append({
                        "name": col_name,
                        "type": col_type,
                        "nullable": col_notnull == 0,
                        "isPrimaryKey": col_pk == 1,
                        "isForeignKey": col_index in fk_mapping,
                        "references": fk_mapping.get(col_index)
                    })
                
                table_info = {
                    "tableName": table,
                    "rowCount": row_count,
                    "columns": columns,
                    "sampleRows": sample_rows
                }
                
                result["tables"].append(table_info)
            
            return result
            
        finally:
            cursor.close()
    
    def get_table_info(self, table_name: str) -> Dict[str, Any]:
        """Get detailed information about a specific SQLite table"""
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            # Get table structure
            cursor.execute(f"PRAGMA table_info(`{table_name}`)")
            columns_info = cursor.fetchall()
            
            # Get foreign keys
            cursor.execute(f"PRAGMA foreign_key_list(`{table_name}`)")
            foreign_keys = cursor.fetchall()
            
            # Create a mapping of column index to its foreign key reference
            fk_mapping = {}
            for fk in foreign_keys:
                fk_mapping[fk[3]] = {
                    "table": fk[2],
                    "column": fk[4]
                }
            
            # Get sample rows
            cursor.execute(f"SELECT * FROM `{table_name}` LIMIT 5")
            sample_rows = []
            for row in cursor.fetchall():
                sample_rows.append({cursor.description[i][0]: row[i] for i in range(len(row))})
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) as count FROM `{table_name}`")
            row_count = cursor.fetchone()[0]
            
            columns = []
            for col in columns_info:
                col_index = col[0]
                col_name = col[1]
                col_type = col[2]
                col_notnull = col[3]
                col_pk = col[5]
                
                columns.append({
                    "name": col_name,
                    "type": col_type,
                    "nullable": col_notnull == 0,
                    "isPrimaryKey": col_pk == 1,
                    "isForeignKey": col_index in fk_mapping,
                    "references": fk_mapping.get(col_index)
                })
            
            return {
                "tableName": table_name,
                "rowCount": row_count,
                "columns": columns,
                "sampleRows": sample_rows
            }
            
        finally:
            cursor.close()

class MSSQLConnector(DatabaseConnector):
    """Microsoft SQL Server connector using ODBC"""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize with connection config
        
        Args:
            config: Dict with host, port, database, username, password
        """
        self.config = config
        self.connection = None
        self.cursor = None
        
        # Try to find an appropriate ODBC driver - we'll try multiple common drivers
        self.odbc_drivers = [
            "ODBC Driver 18 for SQL Server",  # Latest driver (2022+)
            "ODBC Driver 17 for SQL Server",  # Common version (2016+)
            "ODBC Driver 13 for SQL Server",  # Older but common (2014+)
            "ODBC Driver 11 for SQL Server",  # Legacy support
            "SQL Server Native Client 11.0",  # Older version
            "SQL Server Native Client 10.0",  # Even older
            "SQL Server"                      # Generic fallback
        ]
    
    def connect(self) -> Any:
        """Connect to MS SQL Server database using available ODBC drivers
        
        Tries each driver in sequence until a connection is established
        
        Returns:
            pyodbc.Connection: Active database connection
            
        Raises:
            ConnectionError: If unable to connect with any available driver
        """
        if self.connection:
            return self.connection
        
        # Get available drivers on the system
        available_drivers = self.get_available_drivers()
        print(f"Available SQL Server drivers on system: {available_drivers}")
        
        # Prioritize drivers that are actually available on the system
        drivers_to_try = []
        for driver in self.odbc_drivers:
            if driver in available_drivers:
                drivers_to_try.append(driver)
        
        # If no preferred drivers are available, try all available ones
        if not drivers_to_try:
            drivers_to_try = available_drivers
        
        # If still no drivers, fall back to our predefined list
        if not drivers_to_try:
            drivers_to_try = self.odbc_drivers
            print("Warning: No SQL Server drivers detected on system, trying predefined list")
        
        print(f"Will attempt connection with drivers: {drivers_to_try}")
        
        # Try each driver in sequence
        last_error = None
        for driver in drivers_to_try:
            try:
                # Check if host contains a named instance (contains '\')
                host = self.config['host']
                port = self.config['port']
                
                # For named instances, we need to handle the connection string differently
                if '\\' in host:
                    # For named instances, we don't include the port in the connection string
                    connection_string = (
                        f"DRIVER={{{driver}}};"
                        f"SERVER={host};"
                        f"DATABASE={self.config['database']};"
                        f"UID={self.config['username']};"
                        f"PWD={self.config['password']};"
                        "Trusted_Connection=no;"
                    )
                else:
                    # Standard connection with host and port
                    connection_string = (
                        f"DRIVER={{{driver}}};"
                        f"SERVER={host},{port};"
                        f"DATABASE={self.config['database']};"
                        f"UID={self.config['username']};"
                        f"PWD={self.config['password']};"
                        "Trusted_Connection=no;"
                    )
                
                print(f"Attempting connection with driver: {driver}")
                
                # Try to connect with this driver with retry logic
                for attempt in range(2):  # Try twice for each driver
                    try:
                        self.connection = pyodbc.connect(connection_string, timeout=10)
                        print(f"✅ Connected to SQL Server using driver: {driver} (attempt {attempt + 1})")
                        return self.connection
                    except pyodbc.Error as err:
                        if attempt == 0:  # First attempt failed, try once more
                            print(f"⚠️  First attempt failed with driver '{driver}', retrying...")
                            import time
                            time.sleep(1)  # Brief pause before retry
                            continue
                        else:
                            # Both attempts failed, record error and try next driver
                            last_error = err
                            print(f"❌ Failed with driver '{driver}' after 2 attempts: {str(err)}")
                            break
            except Exception as general_err:
                # Catch any other unexpected errors
                last_error = general_err
                print(f"❌ Unexpected error with driver '{driver}': {str(general_err)}")
                continue
        
        # If we get here, all drivers failed
        tried_drivers = ", ".join(drivers_to_try)
        available_system_drivers = ", ".join(available_drivers) if available_drivers else "None detected"
        raise ConnectionError(
            f"Failed to connect to SQL Server with any available driver. "
            f"Tried drivers: [{tried_drivers}]. "
            f"Available system drivers: [{available_system_drivers}]. "
            f"Last error: {last_error}. "
            f"Please ensure ODBC Driver 17+ for SQL Server is installed."
        )
    
    def disconnect(self) -> None:
        """Close SQL Server connection"""
        if self.connection:
            if self.cursor:
                self.cursor.close()
            self.connection.close()
            self.connection = None
            self.cursor = None
    
    def test_connection(self) -> Tuple[bool, str]:
        """Test SQL Server connection"""
        try:
            # Use our connect method that tries multiple drivers
            conn = self.connect()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            conn.close()
            self.connection = None  # Reset connection to ensure fresh connect next time
            return True, "Connection successful"
        except (pyodbc.Error, ConnectionError) as err:
            return False, f"Connection failed: {str(err)}"
    
    def execute_query(self, sql: str) -> Dict[str, Any]:
        """Execute SQL query on SQL Server"""
        start_time = __import__('time').time()
        result = {
            "type": "error",
            "message": "",
            "executionTimeMs": 0
        }
        
        try:
            conn = self.connect()
            cursor = conn.cursor()
            
            # Determine if this is a SELECT query or a different type
            is_select = sql.strip().upper().startswith("SELECT")
            
            cursor.execute(sql)
            
            if is_select:
                rows = cursor.fetchall()
                columns = cursor.description
                
                # Convert rows to list of values
                row_values = []
                for row in rows:
                    row_values.append([row[i] for i in range(len(row))])
                
                result.update({
                    "type": "select",
                    "columns": [{"name": col[0], "type": self._map_sql_server_type(col[1])} for col in columns],
                    "rows": row_values,
                    "rowCount": len(rows),
                })
            else:
                conn.commit()
                result.update({
                    "type": "write",
                    "affectedRows": cursor.rowcount,
                    "message": f"{cursor.rowcount} row(s) affected"
                })
                
            result["executionTimeMs"] = (__import__('time').time() - start_time) * 1000
            cursor.close()
            return result
            
        except pyodbc.Error as err:
            result.update({
                "message": str(err),
                "executionTimeMs": (__import__('time').time() - start_time) * 1000
            })
            return result
    
    def _map_sql_server_type(self, type_code: int) -> str:
        """Map SQL Server type codes to string representation"""
        # Enhanced mapping for common SQL Server types
        sql_type_mapping = {
            -150: "UNIQUEIDENTIFIER",  # SQL_GUID
            -9: "NVARCHAR",           # SQL_WVARCHAR
            -8: "NCHAR",              # SQL_WCHAR
            -7: "BIT",                # SQL_BIT
            -6: "TINYINT",            # SQL_TINYINT
            -5: "BIGINT",             # SQL_BIGINT
            -4: "VARBINARY",          # SQL_LONGVARBINARY (BLOB)
            -3: "VARBINARY",          # SQL_VARBINARY
            -2: "BINARY",             # SQL_BINARY
            -1: "TEXT",               # SQL_LONGVARCHAR (CLOB)
            1: "CHAR",                # SQL_CHAR
            2: "NUMERIC",             # SQL_NUMERIC
            3: "DECIMAL",             # SQL_DECIMAL
            4: "INT",                 # SQL_INTEGER
            5: "SMALLINT",            # SQL_SMALLINT
            6: "FLOAT",               # SQL_FLOAT
            7: "REAL",                # SQL_REAL
            8: "DOUBLE",              # SQL_DOUBLE
            9: "DATETIME",            # SQL_DATETIME
            12: "VARCHAR",            # SQL_VARCHAR
            91: "DATE",               # SQL_TYPE_DATE
            92: "TIME",               # SQL_TYPE_TIME
            93: "TIMESTAMP",          # SQL_TYPE_TIMESTAMP
            # Additional SQL Server specific types
            -11: "DATETIME2",
            -154: "TIME",
            -155: "DATETIMEOFFSET",
        }
        
        return sql_type_mapping.get(type_code, f"UNKNOWN({type_code})")
    
    def get_schema(self) -> Dict[str, Any]:
        """Get SQL Server database schema"""
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            # Get all tables
            tables_query = """
                SELECT TABLE_NAME
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_NAME
            """
            cursor.execute(tables_query)
            tables = [table[0] for table in cursor.fetchall()]
            
            result = {
                "database": self.config["database"],
                "tables": []
            }
            
            # Get primary and foreign keys for all tables
            pk_query = """
                SELECT 
                    TC.TABLE_NAME, 
                    KCU.COLUMN_NAME
                FROM 
                    INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS TC
                    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS KCU
                        ON TC.CONSTRAINT_NAME = KCU.CONSTRAINT_NAME
                WHERE 
                    TC.CONSTRAINT_TYPE = 'PRIMARY KEY'
            """
            cursor.execute(pk_query)
            primary_keys = {}
            for table_name, column_name in cursor.fetchall():
                if table_name not in primary_keys:
                    primary_keys[table_name] = []
                primary_keys[table_name].append(column_name)
            
            # Get foreign key relationships using simpler approach
            try:
                fk_query = """
                    SELECT 
                        OBJECT_NAME(parent_object_id) as parent_table,
                        COL_NAME(parent_object_id, parent_column_id) as parent_column,
                        OBJECT_NAME(referenced_object_id) as ref_table,
                        COL_NAME(referenced_object_id, referenced_column_id) as ref_column
                    FROM sys.foreign_key_columns
                """
                cursor.execute(fk_query)
                foreign_keys = {}
                for table_name, column_name, ref_table, ref_column in cursor.fetchall():
                    if table_name and column_name and ref_table and ref_column:  # Ensure no NULLs
                        key = (table_name, column_name)
                        foreign_keys[key] = (ref_table, ref_column)
            except Exception as e:
                print(f"Warning: Could not get foreign keys: {e}")
                foreign_keys = {}
            
            for table in tables:
                # Get column information
                columns_query = f"""
                    SELECT 
                        COLUMN_NAME,
                        DATA_TYPE,
                        IS_NULLABLE,
                        CHARACTER_MAXIMUM_LENGTH,
                        NUMERIC_PRECISION,
                        NUMERIC_SCALE
                    FROM 
                        INFORMATION_SCHEMA.COLUMNS
                    WHERE 
                        TABLE_NAME = '{table}'
                    ORDER BY 
                        ORDINAL_POSITION
                """
                cursor.execute(columns_query)
                columns_data = cursor.fetchall()
                
                # Get sample rows
                try:
                    cursor.execute(f"SELECT TOP 5 * FROM [{table}]")
                    sample_rows = []
                    if cursor.description:
                        column_names = [column[0] for column in cursor.description]
                        for row in cursor.fetchall():
                            sample_rows.append(dict(zip(column_names, row)))
                except pyodbc.Error:
                    sample_rows = []
                
                # Get row count (with timeout protection)
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM [{table}]")
                    row_count = cursor.fetchone()[0]
                except pyodbc.Error:
                    row_count = -1  # Indicate count not available
                
                columns = []
                for col_data in columns_data:
                    col_name = col_data[0]
                    col_type = col_data[1]
                    is_nullable = col_data[2] == 'YES'
                    
                    # Add length/precision info to type if available
                    if col_data[3]:  # Character length
                        col_type = f"{col_type}({col_data[3]})"
                    elif col_data[4]:  # Numeric precision
                        if col_data[5] is not None:  # Has scale
                            col_type = f"{col_type}({col_data[4]},{col_data[5]})"
                        else:
                            col_type = f"{col_type}({col_data[4]})"
                    
                    # Check if this column is a primary key
                    is_primary_key = table in primary_keys and col_name in primary_keys[table]
                    
                    # Check if this column is a foreign key
                    is_foreign_key = (table, col_name) in foreign_keys
                    references = None
                    if is_foreign_key:
                        ref_table, ref_column = foreign_keys[(table, col_name)]
                        references = {
                            "table": ref_table,
                            "column": ref_column
                        }
                    
                    columns.append({
                        "name": col_name,
                        "type": col_type,
                        "nullable": is_nullable,
                        "isPrimaryKey": is_primary_key,
                        "isForeignKey": is_foreign_key,
                        "references": references
                    })
                
                table_info = {
                    "tableName": table,
                    "rowCount": row_count,
                    "columns": columns,
                    "sampleRows": sample_rows
                }
                
                result["tables"].append(table_info)
            
            return result
            
        finally:
            cursor.close()
    
    def get_table_info(self, table_name: str) -> Dict[str, Any]:
        """Get detailed information about a specific SQL Server table"""
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            # Get column information
            columns_query = f"""
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    IS_NULLABLE,
                    CHARACTER_MAXIMUM_LENGTH,
                    NUMERIC_PRECISION,
                    NUMERIC_SCALE
                FROM 
                    INFORMATION_SCHEMA.COLUMNS
                WHERE 
                    TABLE_NAME = '{table_name}'
                ORDER BY 
                    ORDINAL_POSITION
            """
            cursor.execute(columns_query)
            columns_data = cursor.fetchall()
            
            # Get primary key information
            pk_query = f"""
                SELECT 
                    KCU.COLUMN_NAME
                FROM 
                    INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS TC
                    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS KCU
                        ON TC.CONSTRAINT_NAME = KCU.CONSTRAINT_NAME
                WHERE 
                    TC.CONSTRAINT_TYPE = 'PRIMARY KEY'
                    AND KCU.TABLE_NAME = '{table_name}'
            """
            cursor.execute(pk_query)
            primary_keys = [row[0] for row in cursor.fetchall()]
            
            # Get foreign key information using simpler approach
            try:
                fk_query = f"""
                    SELECT 
                        COL_NAME(parent_object_id, parent_column_id) as parent_column,
                        OBJECT_NAME(referenced_object_id) as ref_table,
                        COL_NAME(referenced_object_id, referenced_column_id) as ref_column
                    FROM sys.foreign_key_columns
                    WHERE OBJECT_NAME(parent_object_id) = '{table_name}'
                """
                cursor.execute(fk_query)
                foreign_keys = {}
                for column_name, ref_table, ref_column in cursor.fetchall():
                    if column_name and ref_table and ref_column:  # Ensure no NULLs
                        foreign_keys[column_name] = (ref_table, ref_column)
            except Exception as e:
                print(f"Warning: Could not get foreign keys for {table_name}: {e}")
                foreign_keys = {}
            
            # Get sample rows
            try:
                cursor.execute(f"SELECT TOP 5 * FROM [{table_name}]")
                sample_rows = []
                if cursor.description:
                    column_names = [column[0] for column in cursor.description]
                    for row in cursor.fetchall():
                        sample_rows.append(dict(zip(column_names, row)))
            except pyodbc.Error:
                sample_rows = []
            
            # Get row count
            try:
                cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
                row_count = cursor.fetchone()[0]
            except pyodbc.Error:
                row_count = -1  # Indicate count not available
            
            columns = []
            for col_data in columns_data:
                col_name = col_data[0]
                col_type = col_data[1]
                is_nullable = col_data[2] == 'YES'
                
                # Add length/precision info to type if available
                if col_data[3]:  # Character length
                    col_type = f"{col_type}({col_data[3]})"
                elif col_data[4]:  # Numeric precision
                    if col_data[5] is not None:  # Has scale
                        col_type = f"{col_type}({col_data[4]},{col_data[5]})"
                    else:
                        col_type = f"{col_type}({col_data[4]})"
                
                # Check if this column is a primary key
                is_primary_key = col_name in primary_keys
                
                # Check if this column is a foreign key
                is_foreign_key = col_name in foreign_keys
                references = None
                if is_foreign_key:
                    ref_table, ref_column = foreign_keys[col_name]
                    references = {
                        "table": ref_table,
                        "column": ref_column
                    }
                
                columns.append({
                    "name": col_name,
                    "type": col_type,
                    "nullable": is_nullable,
                    "isPrimaryKey": is_primary_key,
                    "isForeignKey": is_foreign_key,
                    "references": references
                })
            
            return {
                "tableName": table_name,
                "rowCount": row_count,
                "columns": columns,
                "sampleRows": sample_rows
            }
            
        finally:
            cursor.close()
    
    def get_available_drivers(self) -> List[str]:
        """Get list of available ODBC drivers for SQL Server on the system
        
        Returns:
            List of available SQL Server ODBC driver names
        """
        try:
            if pyodbc is None:
                return []
            
            available_drivers = []
            for driver in pyodbc.drivers():
                # Check if it's a SQL Server driver
                if 'sql server' in driver.lower():
                    available_drivers.append(driver)
            
            return available_drivers
        except Exception as e:
            print(f"Warning: Could not enumerate ODBC drivers: {e}")
            return []

class PostgreSQLConnector(DatabaseConnector):
    """PostgreSQL database connector implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize with connection config
        
        Args:
            config: Dict with host, port, database, username, password
        """
        self.config = config
        self.connection = None
        self.cursor = None
    
    def connect(self) -> Any:
        """Connect to PostgreSQL database"""
        if self.connection and not self.connection.closed:
            return self.connection
            
        try:
            self.connection = psycopg2.connect(
                host=self.config["host"],
                port=self.config["port"],
                database=self.config["database"],
                user=self.config["username"],
                password=self.config["password"]
            )
            return self.connection
        except psycopg2.Error as err:
            raise ConnectionError(f"Failed to connect to PostgreSQL: {err}")
    
    def disconnect(self) -> None:
        """Close PostgreSQL connection"""
        if self.connection and not self.connection.closed:
            if self.cursor:
                self.cursor.close()
            self.connection.close()
            self.connection = None
            self.cursor = None
    
    def test_connection(self) -> Tuple[bool, str]:
        """Test PostgreSQL connection"""
        try:
            conn = psycopg2.connect(
                host=self.config["host"],
                port=self.config["port"],
                database=self.config["database"],
                user=self.config["username"],
                password=self.config["password"],
                connect_timeout=5  # Short timeout for testing
            )
            if not conn.closed:
                conn.close()
                return True, "Connection successful"
            return False, "Could not establish connection"
        except psycopg2.Error as err:
            return False, f"Connection failed: {str(err)}"
    
    def _map_postgresql_type(self, type_oid: int) -> str:
        """Map PostgreSQL type OIDs to string representation"""
        # Common PostgreSQL type OIDs
        pg_type_mapping = {
            16: "BOOLEAN",
            17: "BYTEA",
            18: "CHAR",
            19: "NAME",
            20: "BIGINT",
            21: "SMALLINT",
            22: "INT2VECTOR",
            23: "INTEGER",
            24: "REGPROC",
            25: "TEXT",
            26: "OID",
            27: "TID",
            28: "XID",
            29: "CID",
            114: "JSON",
            142: "XML",
            700: "REAL",
            701: "DOUBLE PRECISION",
            1043: "VARCHAR",
            1082: "DATE",
            1083: "TIME",
            1114: "TIMESTAMP",
            1184: "TIMESTAMPTZ",
            1266: "TIMETZ",
            1700: "NUMERIC",
            2950: "UUID",
            3802: "JSONB",
        }
        
        return pg_type_mapping.get(type_oid, f"UNKNOWN({type_oid})")

    def execute_query(self, sql: str) -> Dict[str, Any]:
        """Execute SQL query on PostgreSQL"""
        start_time = __import__('time').time()
        result = {
            "type": "error",
            "message": "",
            "executionTimeMs": 0
        }
        
        try:
            conn = self.connect()
            cursor = conn.cursor()
            
            # Determine if this is a SELECT query or a different type
            is_select = sql.strip().upper().startswith("SELECT")
            
            cursor.execute(sql)
            
            if is_select:
                rows = cursor.fetchall()
                columns = cursor.description
                result.update({
                    "type": "select",
                    "columns": [{"name": col[0], "type": self._map_postgresql_type(col[1])} for col in columns],
                    "rows": [[cell for cell in row] for row in rows],
                    "rowCount": len(rows),
                })
            else:
                conn.commit()
                result.update({
                    "type": "write",
                    "affectedRows": cursor.rowcount,
                    "message": f"{cursor.rowcount} row(s) affected"
                })
                
            result["executionTimeMs"] = (__import__('time').time() - start_time) * 1000
            cursor.close()
            return result
            
        except psycopg2.Error as err:
            result.update({
                "message": str(err),
                "executionTimeMs": (__import__('time').time() - start_time) * 1000
            })
            return result
        
    def get_schema(self) -> Dict[str, Any]:
        """Get PostgreSQL database schema"""
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            # Get all tables in the public schema
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
            tables = [table[0] for table in cursor.fetchall()]
            
            result = {
                "database": self.config["database"],
                "tables": []
            }
            
            for table in tables:
                # Get table structure
                cursor.execute("""
                    SELECT 
                        column_name, 
                        data_type, 
                        is_nullable,
                        column_default,
                        character_maximum_length,
                        numeric_precision,
                        numeric_scale
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = %s
                    ORDER BY ordinal_position
                """, (table,))
                columns_info = cursor.fetchall()
                
                # Get primary keys
                cursor.execute("""
                    SELECT column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.table_schema = 'public' 
                    AND tc.table_name = %s 
                    AND tc.constraint_type = 'PRIMARY KEY'
                """, (table,))
                primary_keys = [row[0] for row in cursor.fetchall()]
                
                # Get foreign keys
                cursor.execute("""
                    SELECT 
                        kcu.column_name,
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY' 
                    AND tc.table_schema = 'public'
                    AND tc.table_name = %s
                """, (table,))
                foreign_keys_info = cursor.fetchall()
                
                # Create foreign key mapping
                foreign_keys = {}
                for fk_col, fk_table, fk_ref_col in foreign_keys_info:
                    foreign_keys[fk_col] = {
                        "table": fk_table,
                        "column": fk_ref_col
                    }
                
                # Get sample rows
                try:
                    cursor.execute(f'SELECT * FROM "{table}" LIMIT 5')
                    sample_rows = []
                    if cursor.description:
                        column_names = [desc[0] for desc in cursor.description]
                        for row in cursor.fetchall():
                            sample_rows.append(dict(zip(column_names, row)))
                except psycopg2.Error:
                    sample_rows = []
                
                # Get row count
                try:
                    cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
                    row_count = cursor.fetchone()[0]
                except psycopg2.Error:
                    row_count = -1
                
                columns = []
                for col_info in columns_info:
                    col_name = col_info[0]
                    col_type = col_info[1]
                    is_nullable = col_info[2] == 'YES'
                    
                    # Add length/precision info to type if available
                    if col_info[4]:  # Character length
                        col_type = f"{col_type}({col_info[4]})"
                    elif col_info[5]:  # Numeric precision
                        if col_info[6] is not None:  # Has scale
                            col_type = f"{col_type}({col_info[5]},{col_info[6]})"
                        else:
                            col_type = f"{col_type}({col_info[5]})"
                    
                    columns.append({
                        "name": col_name,
                        "type": col_type,
                        "nullable": is_nullable,
                        "isPrimaryKey": col_name in primary_keys,
                        "isForeignKey": col_name in foreign_keys,
                        "references": foreign_keys.get(col_name)
                    })
                
                table_info = {
                    "tableName": table,
                    "rowCount": row_count,
                    "columns": columns,
                    "sampleRows": sample_rows
                }
                
                result["tables"].append(table_info)
            
            return result
            
        finally:
            cursor.close()
    
    def get_table_info(self, table_name: str) -> Dict[str, Any]:
        """Get detailed information about a specific PostgreSQL table"""
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            # Get table structure
            cursor.execute("""
                SELECT 
                    column_name, 
                    data_type, 
                    is_nullable,
                    column_default,
                    character_maximum_length,
                    numeric_precision,
                    numeric_scale
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = %s
                ORDER BY ordinal_position
            """, (table_name,))
            columns_info = cursor.fetchall()
            
            # Get primary keys
            cursor.execute("""
                SELECT column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_schema = 'public' 
                AND tc.table_name = %s 
                AND tc.constraint_type = 'PRIMARY KEY'
            """, (table_name,))
            primary_keys = [row[0] for row in cursor.fetchall()]
            
            # Get foreign keys
            cursor.execute("""
                SELECT 
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_schema = 'public'
                AND tc.table_name = %s
            """, (table_name,))
            foreign_keys_info = cursor.fetchall()
            
            # Create foreign key mapping
            foreign_keys = {}
            for fk_col, fk_table, fk_ref_col in foreign_keys_info:
                foreign_keys[fk_col] = {
                    "table": fk_table,
                    "column": fk_ref_col
                }
            
            # Get sample rows
            try:
                cursor.execute(f'SELECT * FROM "{table_name}" LIMIT 5')
                sample_rows = []
                if cursor.description:
                    column_names = [desc[0] for desc in cursor.description]
                    for row in cursor.fetchall():
                        sample_rows.append(dict(zip(column_names, row)))
            except psycopg2.Error:
                sample_rows = []
            
            # Get row count
            try:
                cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
                row_count = cursor.fetchone()[0]
            except psycopg2.Error:
                row_count = -1
            
            columns = []
            for col_info in columns_info:
                col_name = col_info[0]
                col_type = col_info[1]
                is_nullable = col_info[2] == 'YES'
                
                # Add length/precision info to type if available
                if col_info[4]:  # Character length
                    col_type = f"{col_type}({col_info[4]})"
                elif col_info[5]:  # Numeric precision
                    if col_info[6] is not None:  # Has scale
                        col_type = f"{col_type}({col_info[5]},{col_info[6]})"
                    else:
                        col_type = f"{col_type}({col_info[5]})"
                
                columns.append({
                    "name": col_name,
                    "type": col_type,
                    "nullable": is_nullable,
                    "isPrimaryKey": col_name in primary_keys,
                    "isForeignKey": col_name in foreign_keys,
                    "references": foreign_keys.get(col_name)
                })
            
            return {
                "tableName": table_name,
                "rowCount": row_count,
                "columns": columns,
                "sampleRows": sample_rows
            }
            
        finally:
            cursor.close()

class MongoDBConnector(DatabaseConnector):
    """MongoDB database connector implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize with connection config
        
        Args:
            config: Dict with host, port, database, username, password
        """
        self.config = config
        self.connection = None
        self.database = None
    
    def connect(self) -> Any:
        """Connect to MongoDB database"""
        if self.connection:
            return self.connection
            
        try:
            # First try without authentication to see if MongoDB is accessible
            try:
                no_auth_client = pymongo.MongoClient(f"mongodb://{self.config['host']}:{self.config['port']}/", serverSelectionTimeoutMS=3000)
                no_auth_client.admin.command('ping')
                no_auth_client.close()
                
                # If we have credentials, try with authentication
                if self.config.get("username") and self.config.get("password"):
                    # Try multiple authentication approaches
                    auth_sources = [
                        self.config.get("auth_source", "admin"),  # User specified or default admin
                        self.config["database"],  # Target database
                        "admin"  # Fallback to admin
                    ]
                    
                    connection_string = None
                    
                    for auth_source in auth_sources:
                        try:
                            connection_string = f"mongodb://{self.config['username']}:{self.config['password']}@{self.config['host']}:{self.config['port']}/{self.config['database']}?authSource={auth_source}"
                            test_client = pymongo.MongoClient(connection_string, serverSelectionTimeoutMS=3000)
                            test_client.admin.command('ping')  # Test authentication
                            test_client.close()
                            break  # Success, use this auth_source
                        except pymongo.errors.PyMongoError:
                            continue
                    else:
                        # All auth sources failed, fall back to no-auth connection
                        print("Warning: Authentication failed, falling back to no-auth connection")
                        connection_string = f"mongodb://{self.config['host']}:{self.config['port']}/{self.config['database']}"
                else:
                    connection_string = f"mongodb://{self.config['host']}:{self.config['port']}/{self.config['database']}"
                    
            except pymongo.errors.PyMongoError as err:
                raise ConnectionError(f"MongoDB server not accessible: {err}")

            self.connection = pymongo.MongoClient(connection_string)
            self.database = self.connection[self.config["database"]]
            
            # Test the connection by pinging the server
            self.connection.admin.command('ping')
            
            return self.connection
        except pymongo.errors.PyMongoError as err:
            raise ConnectionError(f"Failed to connect to MongoDB: {err}")
    
    def disconnect(self) -> None:
        """Close MongoDB connection"""
        if self.connection:
            self.connection.close()
            self.connection = None
            self.database = None
    
    def test_connection(self) -> Tuple[bool, str]:
        """Test MongoDB connection"""
        try:
            # First try without authentication to see if MongoDB is accessible
            try:
                no_auth_client = pymongo.MongoClient(f"mongodb://{self.config['host']}:{self.config['port']}/", serverSelectionTimeoutMS=3000)
                no_auth_client.admin.command('ping')
                no_auth_client.close()
                
                # If we have credentials, test with authentication
                if self.config.get("username") and self.config.get("password"):
                    # Try multiple authentication approaches
                    auth_sources = [
                        self.config.get("auth_source", "admin"),  # User specified or default admin
                        self.config["database"],  # Target database
                        "admin"  # Fallback to admin
                    ]
                    
                    for auth_source in auth_sources:
                        try:
                            connection_string = f"mongodb://{self.config['username']}:{self.config['password']}@{self.config['host']}:{self.config['port']}/{self.config['database']}?authSource={auth_source}"
                            client = pymongo.MongoClient(connection_string, serverSelectionTimeoutMS=3000)
                            client.admin.command('ping')  # Test authentication
                            client.close()
                            return True, f"Connection successful (authenticated with {auth_source})"
                        except pymongo.errors.PyMongoError as err:
                            continue
                    
                    # All auth sources failed, but MongoDB is accessible - may not require auth
                    return True, "Connection successful (MongoDB accessible but authentication failed - this may be normal if auth is not enabled)"
                else:
                    return True, "Connection successful (no authentication required)"
                    
            except pymongo.errors.PyMongoError as err:
                return False, f"Connection failed: MongoDB server not accessible - {str(err)}"
                
        except Exception as err:
            return False, f"Connection failed: {str(err)}"
    
    def execute_query(self, query: str) -> Dict[str, Any]:
        """Execute MongoDB query (JavaScript-like syntax)"""
        start_time = __import__('time').time()
        result = {
            "type": "error",
            "message": "",
            "executionTimeMs": 0
        }
        
        try:
            conn = self.connect()
            db = self.database
            
            # Parse MongoDB query - this is a simplified parser
            # In a real implementation, you'd want a more robust parser
            query = query.strip()
            
            # Simple pattern matching for common MongoDB operations
            if query.startswith("db.") and ".find(" in query:
                # Extract collection name and find parameters
                parts = query.split(".")
                if len(parts) >= 3:
                    collection_name = parts[1]
                    collection = db[collection_name]
                    
                    # Execute find operation
                    try:
                        cursor = collection.find().limit(100)  # Limit results
                        documents = list(cursor)
                        
                        # Convert ObjectId to string for JSON serialization
                        for doc in documents:
                            if '_id' in doc:
                                doc['_id'] = str(doc['_id'])
                        
                        result.update({
                            "type": "select",
                            "columns": [{"name": "document", "type": "BSON"}],
                            "rows": [[doc] for doc in documents],
                            "rowCount": len(documents),
                        })
                    except Exception as e:
                        result.update({
                            "message": f"Query execution error: {str(e)}",
                        })
                        
            elif query.startswith("db.") and (".insertOne(" in query or ".insertMany(" in query):
                result.update({
                    "type": "write",
                    "affectedRows": 1,
                    "message": "Insert operation (parsing not fully implemented)"
                })
                
            else:
                result.update({
                    "message": "Unsupported MongoDB query format. Use standard MongoDB syntax like db.collection.find()"
                })
                
            result["executionTimeMs"] = (__import__('time').time() - start_time) * 1000
            return result
            
        except pymongo.errors.PyMongoError as err:
            result.update({
                "message": str(err),
                "executionTimeMs": (__import__('time').time() - start_time) * 1000
            })
            return result
        
    def get_schema(self) -> Dict[str, Any]:
        """Get MongoDB database schema"""
        conn = self.connect()
        db = self.database
        
        try:
            # Get all collections
            collection_names = db.list_collection_names()
            
            result = {
                "database": self.config["database"],
                "tables": []  # MongoDB collections are similar to tables
            }
            
            for collection_name in collection_names:
                collection = db[collection_name]
                
                # Get sample documents to infer schema
                sample_docs = list(collection.find().limit(5))
                
                # Get document count
                doc_count = collection.count_documents({})
                
                # Infer schema from sample documents
                columns = []
                if sample_docs:
                    # Get all unique fields from sample documents
                    all_fields = set()
                    for doc in sample_docs:
                        all_fields.update(doc.keys())
                    
                    for field in sorted(all_fields):
                        # Try to infer type from first occurrence
                        field_type = "Mixed"
                        for doc in sample_docs:
                            if field in doc:
                                value = doc[field]
                                if isinstance(value, str):
                                    field_type = "String"
                                elif isinstance(value, int):
                                    field_type = "Number"
                                elif isinstance(value, float):
                                    field_type = "Number"
                                elif isinstance(value, bool):
                                    field_type = "Boolean"
                                elif isinstance(value, ObjectId):
                                    field_type = "ObjectId"
                                elif isinstance(value, dict):
                                    field_type = "Object"
                                elif isinstance(value, list):
                                    field_type = "Array"
                                break
                        
                        columns.append({
                            "name": field,
                            "type": field_type,
                            "nullable": True,  # MongoDB fields are typically optional
                            "isPrimaryKey": field == "_id",
                            "isForeignKey": False,
                            "references": None
                        })
                
                # Convert sample documents for display
                sample_rows = []
                for doc in sample_docs:
                    # Convert ObjectId to string
                    if '_id' in doc:
                        doc['_id'] = str(doc['_id'])
                    sample_rows.append(doc)
                
                table_info = {
                    "tableName": collection_name,
                    "rowCount": doc_count,
                    "columns": columns,
                    "sampleRows": sample_rows
                }
                
                result["tables"].append(table_info)
            
            return result
            
        except pymongo.errors.PyMongoError as err:
            return {"error": str(err)}
    
    def get_table_info(self, collection_name: str) -> Dict[str, Any]:
        """Get detailed information about a specific MongoDB collection"""
        conn = self.connect()
        db = self.database
        
        try:
            collection = db[collection_name]
            
            # Get sample documents to infer schema
            sample_docs = list(collection.find().limit(10))
            
            # Get document count
            doc_count = collection.count_documents({})
            
            # Infer schema from sample documents
            columns = []
            if sample_docs:
                # Get all unique fields from sample documents
                all_fields = set()
                for doc in sample_docs:
                    all_fields.update(doc.keys())
                
                for field in sorted(all_fields):
                    # Try to infer type from first occurrence
                    field_type = "Mixed"
                    for doc in sample_docs:
                        if field in doc:
                            value = doc[field]
                            if isinstance(value, str):
                                field_type = "String"
                            elif isinstance(value, int):
                                field_type = "Number"
                            elif isinstance(value, float):
                                field_type = "Number"
                            elif isinstance(value, bool):
                                field_type = "Boolean"
                            elif isinstance(value, ObjectId):
                                field_type = "ObjectId"
                            elif isinstance(value, dict):
                                field_type = "Object"
                            elif isinstance(value, list):
                                field_type = "Array"
                            break
                    
                    columns.append({
                        "name": field,
                        "type": field_type,
                        "nullable": True,  # MongoDB fields are typically optional
                        "isPrimaryKey": field == "_id",
                        "isForeignKey": False,
                        "references": None
                    })
            
            # Convert sample documents for display
            sample_rows = []
            for doc in sample_docs:
                # Convert ObjectId to string
                if '_id' in doc:
                    doc['_id'] = str(doc['_id'])
                sample_rows.append(doc)
            
            return {
                "tableName": collection_name,
                "rowCount": doc_count,
                "columns": columns,
                "sampleRows": sample_rows
            }
            
        except pymongo.errors.PyMongoError as err:
            return {"error": str(err)}

def create_connector(config: Dict[str, Any]) -> DatabaseConnector:
    """Factory function to create the appropriate database connector
    
    Args:
        config: Dictionary containing connection configuration with 'database_type' key
        
    Returns:
        DatabaseConnector: Appropriate connector instance
        
    Raises:
        ValueError: If database_type is not supported
    """
    database_type = config.get("database_type", "mysql").lower()
    
    if database_type == "mysql":
        return MySQLConnector(config)
    elif database_type == "sqlite":
        return SQLiteConnector(config)
    elif database_type == "postgresql" or database_type == "postgres":
        if psycopg2 is None:
            raise ValueError("PostgreSQL support requires psycopg2 to be installed")
        return PostgreSQLConnector(config)
    elif database_type == "mssql" or database_type == "sqlserver":
        if pyodbc is None:
            raise ValueError("MSSQL support requires pyodbc to be installed")
        return MSSQLConnector(config)
    elif database_type == "mongodb" or database_type == "mongo":
        if pymongo is None:
            raise ValueError("MongoDB support requires pymongo to be installed")
        return MongoDBConnector(config)
    else:
        raise ValueError(f"Unsupported database type: {database_type}")