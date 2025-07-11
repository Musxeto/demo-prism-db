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
                    "columns": [{"name": col[0], "type": str(col[1])} for col in columns],
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
            "ODBC Driver 18 for SQL Server",  # Latest driver
            "ODBC Driver 17 for SQL Server",  # Common version
            "ODBC Driver 13 for SQL Server",  # Older but common
            "SQL Server Native Client 11.0",  # Older version
            "SQL Server Native Client 10.0",  # Even older
            "SQL Server"                      # Generic name
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
        
        # Try each driver in sequence
        last_error = None
        for driver in self.odbc_drivers:
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
                
                # Try to connect with this driver
                self.connection = pyodbc.connect(connection_string, timeout=5)
                print(f"Connected to SQL Server using driver: {driver}")
                return self.connection
            except pyodbc.Error as err:
                # If driver not found or other error, try next driver
                last_error = err
                continue
        
        # If we get here, all drivers failed
        raise ConnectionError(f"Failed to connect to SQL Server with any available driver. Last error: {last_error}")
    
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
        # This is a simplification, as pyodbc doesn't expose type names directly
        # A complete implementation would map all SQL Server type codes
        sql_type_mapping = {
            -150: "SQL_GUID",
            -9: "SQL_WVARCHAR",
            -8: "SQL_WCHAR",
            -7: "SQL_BIT",
            -6: "SQL_TINYINT",
            -5: "SQL_BIGINT",
            -4: "SQL_LONGVARBINARY",
            -3: "SQL_VARBINARY",
            -2: "SQL_BINARY",
            -1: "SQL_LONGVARCHAR",
            1: "SQL_CHAR",
            2: "SQL_NUMERIC",
            3: "SQL_DECIMAL",
            4: "SQL_INTEGER",
            5: "SQL_SMALLINT",
            6: "SQL_FLOAT",
            7: "SQL_REAL",
            8: "SQL_DOUBLE",
            9: "SQL_DATETIME",
            12: "SQL_VARCHAR",
            91: "SQL_TYPE_DATE",
            92: "SQL_TYPE_TIME",
            93: "SQL_TYPE_TIMESTAMP",
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
            
            fk_query = """
                SELECT
                    FK.TABLE_NAME,
                    CU.COLUMN_NAME,
                    PK.TABLE_NAME AS REFERENCED_TABLE_NAME,
                    PT.COLUMN_NAME AS REFERENCED_COLUMN_NAME
                FROM
                    INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS AS FK
                    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS PK
                        ON FK.UNIQUE_CONSTRAINT_NAME = PK.CONSTRAINT_NAME
                    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS CU
                        ON FK.CONSTRAINT_NAME = CU.CONSTRAINT_NAME
                    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS PT
                        ON PK.CONSTRAINT_NAME = PT.CONSTRAINT_NAME
                        AND CU.ORDINAL_POSITION = PT.ORDINAL_POSITION
            """
            cursor.execute(fk_query)
            foreign_keys = {}
            for table_name, column_name, ref_table, ref_column in cursor.fetchall():
                key = (table_name, column_name)
                foreign_keys[key] = (ref_table, ref_column)
            
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
            
            # Get foreign key information
            fk_query = f"""
                SELECT
                    CU.COLUMN_NAME,
                    PK.TABLE_NAME AS REFERENCED_TABLE_NAME,
                    PT.COLUMN_NAME AS REFERENCED_COLUMN_NAME
                FROM
                    INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS AS FK
                    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS C
                        ON C.CONSTRAINT_NAME = FK.CONSTRAINT_NAME
                    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS PK
                        ON FK.UNIQUE_CONSTRAINT_NAME = PK.CONSTRAINT_NAME
                    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS CU
                        ON C.CONSTRAINT_NAME = CU.CONSTRAINT_NAME
                    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS PT
                        ON PK.CONSTRAINT_NAME = PT.CONSTRAINT_NAME
                        AND CU.ORDINAL_POSITION = PT.ORDINAL_POSITION
                WHERE
                    C.TABLE_NAME = '{table_name}'
            """
            cursor.execute(fk_query)
            foreign_keys = {}
            for column_name, ref_table, ref_column in cursor.fetchall():
                foreign_keys[column_name] = (ref_table, ref_column)
            
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
        if self.connection:
            # Check if connection is still open
            try:
                # A simple check if the connection is still active
                self.connection.status
                return self.connection
            except (psycopg2.InterfaceError, psycopg2.OperationalError):
                # Connection is closed or broken, create a new one
                pass
            
        try:
            self.connection = psycopg2.connect(
                host=self.config["host"],
                port=self.config["port"],
                user=self.config["username"],
                password=self.config["password"],
                dbname=self.config["database"]
            )
            return self.connection
        except psycopg2.Error as err:
            raise ConnectionError(f"Failed to connect to PostgreSQL: {err}")
    
    def disconnect(self) -> None:
        """Close PostgreSQL connection"""
        if self.connection:
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
                user=self.config["username"],
                password=self.config["password"],
                dbname=self.config["database"],
                connect_timeout=5  # Short timeout for testing
            )
            if conn:
                conn.close()
                return True, "Connection successful"
            return False, "Could not establish connection"
        except psycopg2.Error as err:
            return False, f"Connection failed: {str(err)}"
    
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
                
                # PostgreSQL returns column info differently, adjust format to match our standard
                column_info = [{"name": col[0], "type": self._map_pg_type(col[1])} for col in columns]
                
                # Convert rows to list of values
                formatted_rows = []
                for row in rows:
                    formatted_rows.append(list(row))
                
                result.update({
                    "type": "select",
                    "columns": column_info,
                    "rows": formatted_rows,
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
    
    def _map_pg_type(self, type_code: int) -> str:
        """Map PostgreSQL type OIDs to type names
        
        This is a simple mapping, can be expanded as needed.
        """
        # Common PostgreSQL type OIDs
        types = {
            16: "boolean",
            20: "bigint",
            21: "smallint",
            23: "integer",
            25: "text",
            700: "real",
            701: "double precision",
            1042: "char",
            1043: "varchar",
            1082: "date",
            1083: "time",
            1114: "timestamp",
            1184: "timestamptz",
            1700: "numeric",
        }
        return types.get(type_code, str(type_code))
    
    def get_schema(self) -> Dict[str, Any]:
        """Get PostgreSQL database schema"""
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            # Get all tables in the public schema
            cursor.execute("""
                SELECT tablename 
                FROM pg_catalog.pg_tables 
                WHERE schemaname = 'public'
            """)
            tables = [table[0] for table in cursor.fetchall()]
            
            result = {
                "database": self.config["database"],
                "tables": []
            }
            
            for table in tables:
                # Get table structure
                cursor.execute(f"""
                    SELECT 
                        column_name, 
                        data_type,
                        is_nullable,
                        column_default,
                        ordinal_position
                    FROM information_schema.columns
                    WHERE table_name = '{table}'
                    ORDER BY ordinal_position
                """)
                columns_data = cursor.fetchall()
                
                # Get primary key information
                cursor.execute(f"""
                    SELECT a.attname
                    FROM pg_index i
                    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                    WHERE i.indrelid = '{table}'::regclass
                    AND i.indisprimary
                """)
                pk_columns = [pk[0] for pk in cursor.fetchall()]
                
                # Get foreign keys
                cursor.execute(f"""
                    SELECT
                        kcu.column_name,
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name
                    FROM
                        information_schema.table_constraints AS tc
                        JOIN information_schema.key_column_usage AS kcu
                          ON tc.constraint_name = kcu.constraint_name
                          AND tc.table_schema = kcu.table_schema
                        JOIN information_schema.constraint_column_usage AS ccu
                          ON ccu.constraint_name = tc.constraint_name
                          AND ccu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_name = '{table}';
                """)
                fk_data = cursor.fetchall()
                
                # Create a mapping of column name to foreign key reference
                fk_mapping = {}
                for fk in fk_data:
                    fk_mapping[fk[0]] = {
                        "table": fk[1],
                        "column": fk[2]
                    }
                
                # Get sample rows
                cursor.execute(f"SELECT * FROM \"{table}\" LIMIT 5")
                sample_rows = cursor.fetchall()
                
                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM \"{table}\"")
                row_count = cursor.fetchone()[0]
                
                # Convert column data to our standardized format
                columns = []
                for col_data in columns_data:
                    col_name = col_data[0]
                    columns.append({
                        "name": col_name,
                        "type": col_data[1],
                        "nullable": col_data[2] == "YES",
                        "isPrimaryKey": col_name in pk_columns,
                        "isForeignKey": col_name in fk_mapping,
                        "references": fk_mapping.get(col_name)
                    })
                
                # Sample rows need to be a list of dictionaries for easy display
                formatted_sample_rows = []
                for row in sample_rows:
                    row_dict = {}
                    for i, col in enumerate(columns):
                        row_dict[col["name"]] = row[i]
                    formatted_sample_rows.append(row_dict)
                
                table_info = {
                    "tableName": table,
                    "rowCount": row_count,
                    "columns": columns,
                    "sampleRows": formatted_sample_rows
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
            cursor.execute(f"""
                SELECT 
                    column_name, 
                    data_type,
                    is_nullable,
                    column_default,
                    ordinal_position
                FROM information_schema.columns
                WHERE table_name = '{table_name}'
                ORDER BY ordinal_position
            """)
            columns_data = cursor.fetchall()
            
            # Get primary key information
            cursor.execute(f"""
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                WHERE i.indrelid = '{table_name}'::regclass
                AND i.indisprimary
            """)
            pk_columns = [pk[0] for pk in cursor.fetchall()]
            
            # Get foreign keys
            cursor.execute(f"""
                SELECT
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM
                    information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                      AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = '{table_name}';
            """)
            fk_data = cursor.fetchall()
            
            # Create a mapping of column name to foreign key reference
            fk_mapping = {}
            for fk in fk_data:
                fk_mapping[fk[0]] = {
                    "table": fk[1],
                    "column": fk[2]
                }
            
            # Get sample rows
            cursor.execute(f"SELECT * FROM \"{table_name}\" LIMIT 5")
            sample_rows = cursor.fetchall()
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM \"{table_name}\"")
            row_count = cursor.fetchone()[0]
            
            # Convert column data to our standardized format
            columns = []
            for col_data in columns_data:
                col_name = col_data[0]
                columns.append({
                    "name": col_name,
                    "type": col_data[1],
                    "nullable": col_data[2] == "YES",
                    "isPrimaryKey": col_name in pk_columns,
                    "isForeignKey": col_name in fk_mapping,
                    "references": fk_mapping.get(col_name)
                })
            
            # Sample rows need to be a list of dictionaries for easy display
            formatted_sample_rows = []
            for row in sample_rows:
                row_dict = {}
                for i, col in enumerate(columns):
                    row_dict[col["name"]] = row[i]
                formatted_sample_rows.append(row_dict)
            
            return {
                "tableName": table_name,
                "rowCount": row_count,
                "columns": columns,
                "sampleRows": formatted_sample_rows
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
        self.client = None
        self.db = None
    
    def connect(self) -> Any:
        """Connect to MongoDB database"""
        if self.db is not None:
            # Test if connection is still alive
            try:
                self.client.admin.command('ping')
                return self.db
            except:
                # Connection is stale, reconnect
                self.disconnect()
            
        # Try different authentication configurations
        auth_sources_to_try = []
        
        if self.config.get("username") and self.config.get("password"):
            # If authSource is specified, use it
            if self.config.get("authSource"):
                auth_sources_to_try.append(self.config["authSource"])
            else:
                # Try the database name first (common pattern), then admin
                auth_sources_to_try.extend([self.config["database"], "admin"])
        
        # Base connection parameters
        connection_params = {
            "host": self.config["host"],
            "port": int(self.config["port"]),
            "serverSelectionTimeoutMS": 5000,
            "connectTimeoutMS": 10000,
            "socketTimeoutMS": 10000,
        }
        
        last_error = None
        
        # Try without authentication first if no credentials provided
        if not (self.config.get("username") and self.config.get("password")):
            try:
                self.client = pymongo.MongoClient(**connection_params)
                self.client.admin.command('ping')
                self.db = self.client[self.config["database"]]
                return self.db
            except Exception as err:
                last_error = err
        else:
            # Try each auth source
            for auth_source in auth_sources_to_try:
                try:
                    auth_params = connection_params.copy()
                    auth_params.update({
                        "username": self.config["username"],
                        "password": self.config["password"],
                        "authSource": auth_source
                    })
                    
                    self.client = pymongo.MongoClient(**auth_params)
                    # Test the connection
                    self.client.admin.command('ping')
                    # Access the specific database
                    self.db = self.client[self.config["database"]]
                    return self.db
                    
                except pymongo.errors.AuthenticationFailed as err:
                    last_error = err
                    continue  # Try next auth source
                except Exception as err:
                    last_error = err
                    break  # Other errors are not auth-related, don't retry
        
        # If we get here, all attempts failed
        if isinstance(last_error, pymongo.errors.AuthenticationFailed):
            raise ConnectionError(f"Authentication failed. Tried auth sources: {auth_sources_to_try}. Error: {last_error}")
        elif isinstance(last_error, pymongo.errors.ServerSelectionTimeoutError):
            raise ConnectionError(f"Cannot connect to MongoDB server: {last_error}")
        else:
            raise ConnectionError(f"Failed to connect to MongoDB: {last_error}")
    
    def disconnect(self) -> None:
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            self.client = None
            self.db = None
    
    def test_connection(self) -> Tuple[bool, str]:
        """Test MongoDB connection"""
        # Try different authentication configurations
        auth_sources_to_try = []
        
        if self.config.get("username") and self.config.get("password"):
            # If authSource is specified, use it
            if self.config.get("authSource"):
                auth_sources_to_try.append(self.config["authSource"])
            else:
                # Try the database name first (common pattern), then admin
                auth_sources_to_try.extend([self.config["database"], "admin"])
        
        # Base connection parameters
        connection_params = {
            "host": self.config["host"],
            "port": int(self.config["port"]),
            "serverSelectionTimeoutMS": 5000,
            "connectTimeoutMS": 10000,
            "socketTimeoutMS": 10000,
        }
        
        last_error = None
        
        # Try without authentication first if no credentials provided
        if not (self.config.get("username") and self.config.get("password")):
            try:
                client = pymongo.MongoClient(**connection_params)
                client.admin.command('ping')
                db = client[self.config["database"]]
                collections = db.list_collection_names()
                client.close()
                return True, f"Connection successful (no auth). Found {len(collections)} collections."
            except Exception as err:
                return False, f"Connection failed: {str(err)}"
        else:
            # Try each auth source
            for auth_source in auth_sources_to_try:
                try:
                    auth_params = connection_params.copy()
                    auth_params.update({
                        "username": self.config["username"],
                        "password": self.config["password"],
                        "authSource": auth_source
                    })
                    
                    client = pymongo.MongoClient(**auth_params)
                    client.admin.command('ping')
                    db = client[self.config["database"]]
                    collections = db.list_collection_names()
                    client.close()
                    return True, f"Connection successful (auth source: {auth_source}). Found {len(collections)} collections."
                    
                except pymongo.errors.AuthenticationFailed as err:
                    last_error = f"Authentication failed with auth source '{auth_source}': {str(err)}"
                    continue  # Try next auth source
                except pymongo.errors.ServerSelectionTimeoutError as err:
                    return False, f"Cannot connect to MongoDB server: {str(err)}"
                except Exception as err:
                    return False, f"Connection error: {str(err)}"
        
        # If we get here, all auth attempts failed
        return False, f"Authentication failed. Tried auth sources: {auth_sources_to_try}. Last error: {last_error}"
            
    def _parse_mongo_query(self, query_string: str) -> Tuple[str, str, Any, Dict, int]:
        """Parse MongoDB query string into collection name, query, and options
        
        Example queries:
        - db.users.find({})
        - db.orders.find({"status": "shipped"})
        - db.products.aggregate([{"$match": {"price": {"$gt": 100}}}])
        - db.books.find({}).limit(5)
        
        Returns:
            tuple: (operation, collection_name, query_object, options, limit)
        """
        if not query_string:
            raise ValueError("Empty query")
            
        query_string = query_string.strip()
        
        try:
            # First, handle method chaining like .limit(), .sort(), etc.
            limit = 100  # Default limit
            
            # Extract limit if present
            limit_match = re.search(r'\.limit\((\d+)\)', query_string)
            if limit_match:
                limit = int(limit_match.group(1))
                # Remove the limit part from the query
                query_string = re.sub(r'\.limit\(\d+\)', '', query_string)
            
            # Parse the main operation
            match = re.match(r'db\.([a-zA-Z0-9_]+)\.([a-zA-Z]+)\((.*)\)', query_string)
            if not match:
                raise ValueError("Invalid MongoDB query format. Expected: db.collection.operation({query})")
                
            collection_name = match.group(1)
            operation = match.group(2)
            query_params = match.group(3).strip()

            if not query_params:
                query_params = '{}'
                
            # Handle different parameter formats
            if query_params.startswith('[') and query_params.endswith(']'):
                # Array parameter (for aggregate)
                params_obj = json.loads(query_params)
            elif query_params.startswith('{') and query_params.endswith('}'):
                # Object parameter (for find, insertOne, etc.)
                params_obj = json.loads(query_params)
            else:
                # Try to parse as JSON
                params_obj = json.loads(query_params)
            
            options = {}
            
            # Security check for dangerous operations
            if operation.lower() in ["drop", "dropdatabase", "deletemany"]:
                raise ValueError(f"Operation '{operation}' is not allowed for security reasons")
                
            return operation, collection_name, params_obj, options, limit
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in query: {str(e)}")
        except Exception as e:
            raise ValueError(f"Failed to parse MongoDB query: {str(e)}")
    
    def execute_query(self, query: str) -> Dict[str, Any]:
        """Execute MongoDB query"""
        start_time = __import__('time').time()
        result = {
            "type": "error",
            "message": "",
            "executionTimeMs": 0
        }
        
        try:
            db = self.connect()   
            operation, collection_name, query_obj, options, limit = self._parse_mongo_query(query)  
            if operation.lower() == "find":
                collection = db[collection_name]
                cursor = collection.find(query_obj).limit(limit)
                documents = list(cursor)
                if documents:
                    all_keys = set()
                    for doc in documents:
                        self._extract_keys(doc, all_keys)

                    columns = sorted(list(all_keys))

                    rows = []
                    for doc in documents:
                        row = []
                        for key in columns:
                            value = self._get_nested_value(doc, key)
                            if ObjectId and isinstance(value, ObjectId):
                                value = str(value)
                            elif str(type(value)).find('ObjectId') != -1:
                                value = str(value)
                                
                            row.append(value)
                        rows.append(row)
                        
                    result.update({
                        "type": "select",
                        "columns": [{"name": col, "type": "string"} for col in columns],
                        "rows": rows,
                        "rowCount": len(documents),
                    })
                else:
                    result.update({
                        "type": "select",
                        "columns": [],
                        "rows": [],
                        "rowCount": 0,
                    })
                
            elif operation.lower() == "aggregate":
                collection = db[collection_name]
                documents = list(collection.aggregate(query_obj))
                if documents:
                    all_keys = set()
                    for doc in documents:
                        self._extract_keys(doc, all_keys)
                        
                    columns = sorted(list(all_keys))
                    rows = []
                    
                    for doc in documents:
                        row = []
                        for key in columns:
                            value = self._get_nested_value(doc, key)
                            if ObjectId and isinstance(value, ObjectId):
                                value = str(value)
                            elif str(type(value)).find('ObjectId') != -1:
                                value = str(value)
                                
                            row.append(value)
                        rows.append(row)
                        
                    result.update({
                        "type": "select",
                        "columns": [{"name": col, "type": "string"} for col in columns],
                        "rows": rows,
                        "rowCount": len(documents),
                    })
                else:
                    # No documents found
                    result.update({
                        "type": "select",
                        "columns": [],
                        "rows": [],
                        "rowCount": 0,
                    })
                
            elif operation.lower() == "insertone":
                # Get the collection
                collection = db[collection_name]
                
                # Execute insertOne operation
                insert_result = collection.insert_one(query_obj)
                
                result.update({
                    "type": "write",
                    "affectedRows": 1,
                    "message": f"Inserted document with ID: {insert_result.inserted_id}"
                })
                
            elif operation.lower() == "updateone":
                # For updateOne, we expect two parameters: filter and update
                if not isinstance(query_obj, dict) or len(query_obj) != 2:
                    raise ValueError("updateOne requires two objects: filter and update")
                
                # Get filter and update objects
                filter_obj = list(query_obj.values())[0]
                update_obj = list(query_obj.values())[1]
                
                # Get the collection
                collection = db[collection_name]
                
                # Execute updateOne operation
                update_result = collection.update_one(filter_obj, update_obj)
                
                result.update({
                    "type": "write",
                    "affectedRows": update_result.modified_count,
                    "message": f"{update_result.modified_count} document(s) updated"
                })
                
            elif operation.lower() == "deleteone":
                # Get the collection
                collection = db[collection_name]
                
                # Execute deleteOne operation
                delete_result = collection.delete_one(query_obj)
                
                result.update({
                    "type": "write",
                    "affectedRows": delete_result.deleted_count,
                    "message": f"{delete_result.deleted_count} document(s) deleted"
                })
                
            else:
                raise ValueError(f"Unsupported MongoDB operation: {operation}")
                
        except Exception as e:
            result.update({
                "message": str(e),
            })
            
        # Add execution time
        result["executionTimeMs"] = (__import__('time').time() - start_time) * 1000
        return result
    
    def _extract_keys(self, document: Dict, keys: set, prefix: str = "") -> None:
        """Extract all keys from a nested document, including flattened paths for nested objects"""
        for key, value in document.items():
            # Skip internal MongoDB keys like _id
            if key == "_id":
                # Add _id as a regular key, but don't descend into it
                keys.add(prefix + key if prefix else key)
                continue
                
            # Add the current key
            flat_key = prefix + key if prefix else key
            keys.add(flat_key)
            
            # If the value is a nested document, recurse
            if isinstance(value, dict):
                self._extract_keys(value, keys, flat_key + ".")
    
    def _get_nested_value(self, document: Dict, flat_key: str):
        """Get value from a document using a flattened key path (e.g., 'address.city')"""
        if "." not in flat_key:
            # Direct key
            return document.get(flat_key)
        
        # Split the key path
        parts = flat_key.split(".", 1)
        key, rest = parts
        
        # Get the nested document
        nested_doc = document.get(key)
        
        # If nested document exists and is a dictionary, recurse
        if nested_doc and isinstance(nested_doc, dict):
            return self._get_nested_value(nested_doc, rest)
        
        # Otherwise, return None
        return None
    
    def get_schema(self) -> Dict[str, Any]:
        """Get MongoDB database schema (collections and their structure)"""
        db = self.connect()
        
        try:
            # Get list of all collections
            collection_names = db.list_collection_names()
            
            result = {
                "database": self.config["database"],
                "tables": []  # Collections will be treated as tables
            }
            
            for collection_name in collection_names:
                # Get info about this collection
                collection_info = self.get_table_info(collection_name)
                result["tables"].append(collection_info)
            
            return result
            
        except Exception as e:
            return {
                "database": self.config["database"],
                "error": str(e),                "tables": []
            }
    
    def _convert_objectids_to_strings(self, data):
        """Recursively convert ObjectId instances to strings for JSON serialization"""
        if isinstance(data, list):
            return [self._convert_objectids_to_strings(item) for item in data]
        elif isinstance(data, dict):
            return {key: self._convert_objectids_to_strings(value) for key, value in data.items()}
        elif ObjectId and isinstance(data, ObjectId):
            return str(data)
        elif str(type(data)).find('ObjectId') != -1:
            return str(data)
        else:
            return data

    def get_table_info(self, table_name: str) -> Dict[str, Any]:
        """Get detailed information about a specific collection"""
        db = self.connect()
        
        try:
            # Access the collection
            collection = db[table_name]
            
            # Get sample documents to infer schema
            sample_documents = list(collection.find().limit(5))
            
            # Convert ObjectIds to strings in sample documents for JSON serialization
            serializable_sample_documents = self._convert_objectids_to_strings(sample_documents)
            
            # Count total documents
            document_count = collection.count_documents({})
            
            # Infer schema from sample documents
            all_fields = set()
            for doc in sample_documents:
                self._extract_keys(doc, all_fields)
            
            # Convert to column definitions
            columns = []
            for field in sorted(all_fields):
                # For MongoDB, we don't have strong typing information
                columns.append({
                    "name": field,
                    "type": "DYNAMIC",  # MongoDB has dynamic types
                    "nullable": True,  # Fields in MongoDB are nullable by default
                    "isPrimaryKey": field == "_id",  # _id is the only guaranteed primary key
                    "isForeignKey": False,  # No foreign key concept in MongoDB
                    "references": None
                })
            
            # Get indexes (optional)
            indexes = []
            for index in collection.list_indexes():
                index_info = {
                    "name": index["name"],
                    "fields": list(index["key"].keys()),
                    "unique": index.get("unique", False)
                }
                indexes.append(index_info)
            
            return {
                "tableName": table_name,
                "rowCount": document_count,
                "columns": columns,
                "indexes": indexes,
                "sampleRows": serializable_sample_documents,
                "isMongoDB": True  # Flag to indicate this is a MongoDB collection
            }
        except Exception as e:
            return {
                "tableName": table_name,
                "error": str(e),
                "columns": [],
                "rowCount": 0,
                "isMongoDB": True
            }

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
