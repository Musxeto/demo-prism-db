import re
import time
import mysql.connector
from typing import List, Dict, Any, Optional, Tuple
from mysql.connector import Error
from schemas import QueryResult

class SQLQueryEngine:
    """Enhanced SQL query execution engine with support for all SQL statement types"""
    
    # Dangerous SQL patterns that require confirmation
    DANGEROUS_PATTERNS = [
        r'\bDROP\s+DATABASE\b',
        r'\bDROP\s+SCHEMA\b', 
        r'\bTRUNCATE\s+TABLE\b',
        r'\bDELETE\s+FROM\s+\w+\s*(?:;|$)',  # DELETE without WHERE
        r'\bUPDATE\s+\w+\s+SET\s+.*?(?:;|$)(?!.*WHERE)',  # UPDATE without WHERE
    ]
    
    # SQL statement type patterns
    STATEMENT_PATTERNS = {
        'select': r'^\s*SELECT\b',
        'insert': r'^\s*INSERT\b',
        'update': r'^\s*UPDATE\b',
        'delete': r'^\s*DELETE\b',
        'create_table': r'^\s*CREATE\s+TABLE\b',
        'create_database': r'^\s*CREATE\s+(?:DATABASE|SCHEMA)\b',
        'alter_table': r'^\s*ALTER\s+TABLE\b',
        'drop_table': r'^\s*DROP\s+TABLE\b',
        'drop_database': r'^\s*DROP\s+(?:DATABASE|SCHEMA)\b',
        'truncate': r'^\s*TRUNCATE\b',
        'show': r'^\s*SHOW\b',
        'describe': r'^\s*(?:DESC|DESCRIBE)\b',
        'explain': r'^\s*EXPLAIN\b',
        'use': r'^\s*USE\b',
    }
    
    def __init__(self, connection_config: Dict[str, Any], timeout: int = 10):
        self.connection_config = connection_config
        self.timeout = timeout
        
    def detect_statement_type(self, sql: str) -> str:
        """Detect the type of SQL statement"""
        sql_clean = sql.strip().upper()
        
        for stmt_type, pattern in self.STATEMENT_PATTERNS.items():
            if re.match(pattern, sql_clean, re.IGNORECASE):
                return stmt_type
                
        return 'unknown'
    
    def is_dangerous_query(self, sql: str) -> Tuple[bool, List[str]]:
        """Check if query contains dangerous patterns"""
        warnings = []
        is_dangerous = False
        
        for pattern in self.DANGEROUS_PATTERNS:
            if re.search(pattern, sql, re.IGNORECASE):
                is_dangerous = True
                if 'DROP DATABASE' in pattern:
                    warnings.append("This query will DROP an entire database!")
                elif 'TRUNCATE' in pattern:
                    warnings.append("This query will TRUNCATE a table (delete all rows)!")
                elif 'DELETE FROM' in pattern:
                    warnings.append("This DELETE query has no WHERE clause - it will delete ALL rows!")
                elif 'UPDATE' in pattern:
                    warnings.append("This UPDATE query has no WHERE clause - it will update ALL rows!")
                    
        return is_dangerous, warnings
    
    def split_statements(self, sql: str) -> List[str]:
        """Split SQL into individual statements"""
        # Simple statement splitting - could be enhanced with proper SQL parsing
        statements = []
        current_statement = ""
        in_string = False
        string_char = None
        
        i = 0
        while i < len(sql):
            char = sql[i]
            
            # Handle string literals
            if char in ['"', "'", '`'] and not in_string:
                in_string = True
                string_char = char
                current_statement += char
            elif char == string_char and in_string:
                in_string = False
                string_char = None
                current_statement += char
            elif char == ';' and not in_string:
                # End of statement
                if current_statement.strip():
                    statements.append(current_statement.strip())
                current_statement = ""
            else:
                current_statement += char
                
            i += 1
            
        # Add the last statement if it doesn't end with semicolon
        if current_statement.strip():
            statements.append(current_statement.strip())
            
        return [stmt for stmt in statements if stmt.strip()]
    
    def execute_single_statement(self, sql: str, page: int = 1, page_size: int = 100) -> QueryResult:
        """Execute a single SQL statement"""
        start_time = time.time()
        stmt_type = self.detect_statement_type(sql)
        is_dangerous, warnings = self.is_dangerous_query(sql)
        
        try:
            connection = mysql.connector.connect(**self.connection_config)
            cursor = connection.cursor()
            
            # Set query timeout
            cursor.execute(f"SET SESSION max_execution_time={self.timeout * 1000}")
            
            if stmt_type == 'select' or stmt_type in ['show', 'describe', 'explain']:
                return self._execute_select_query(cursor, sql, page, page_size, start_time, warnings, is_dangerous)
            else:
                return self._execute_write_query(cursor, connection, sql, stmt_type, start_time, warnings, is_dangerous)
                
        except mysql.connector.Error as e:
            execution_time = (time.time() - start_time) * 1000
            return QueryResult(
                type="error",
                message=str(e),
                executionTimeMs=execution_time,
                warnings=warnings,
                isDangerous=is_dangerous
            )
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            return QueryResult(
                type="error",
                message=f"Unexpected error: {str(e)}",
                executionTimeMs=execution_time,
                warnings=warnings,
                isDangerous=is_dangerous
            )
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'connection' in locals():
                connection.close()
    
    def _execute_select_query(self, cursor, sql: str, page: int, page_size: int, 
                            start_time: float, warnings: List[str], is_dangerous: bool) -> QueryResult:
        """Execute SELECT-type queries"""
        cursor.execute(sql)
        
        # Get column information
        columns = [{"name": desc[0], "type": str(desc[1])} for desc in cursor.description] if cursor.description else []
        
        # Fetch all results first to get total count
        all_rows = cursor.fetchall()
        total_rows = len(all_rows)
        
        # Apply pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_rows = all_rows[start_idx:end_idx]
        
        # Convert to list of lists for JSON serialization
        rows = [list(row) for row in paginated_rows]
        
        execution_time = (time.time() - start_time) * 1000
        total_pages = (total_rows + page_size - 1) // page_size if total_rows > 0 else 1
        
        return QueryResult(
            type="select",
            queryType=self.detect_statement_type(sql),
            columns=columns,
            rows=rows,
            rowCount=len(rows),
            totalRows=total_rows,
            page=page,
            pageSize=page_size,
            totalPages=total_pages,
            executionTimeMs=execution_time,
            warnings=warnings,
            isDangerous=is_dangerous
        )
    
    def _execute_write_query(self, cursor, connection, sql: str, stmt_type: str, 
                           start_time: float, warnings: List[str], is_dangerous: bool) -> QueryResult:
        """Execute INSERT/UPDATE/DELETE/DDL queries"""
        cursor.execute(sql)
        affected_rows = cursor.rowcount
        connection.commit()
        
        execution_time = (time.time() - start_time) * 1000
        
        # Determine response type
        if stmt_type in ['insert', 'update', 'delete']:
            response_type = "write"
            message = f"{stmt_type.upper()} completed successfully"
            if affected_rows >= 0:
                message += f" - {affected_rows} row(s) affected"
        else:
            response_type = "ddl"
            message = f"{stmt_type.replace('_', ' ').title()} completed successfully"
            
        return QueryResult(
            type=response_type,
            queryType=stmt_type,
            affectedRows=affected_rows if affected_rows >= 0 else None,
            executionTimeMs=execution_time,
            message=message,
            warnings=warnings,
            isDangerous=is_dangerous
        )
    
    def execute_query(self, sql: str, page: int = 1, page_size: int = 10, 
                     allow_multiple: bool = False, confirm_dangerous: bool = False) -> QueryResult:
        """Main query execution method"""
        statements = self.split_statements(sql)
        
        # Check for dangerous queries
        overall_dangerous = False
        all_warnings = []
        
        for stmt in statements:
            is_dangerous, warnings = self.is_dangerous_query(stmt)
            if is_dangerous:
                overall_dangerous = True
                all_warnings.extend(warnings)
        
        # Require confirmation for dangerous queries
        if overall_dangerous and not confirm_dangerous:
            return QueryResult(
                type="error",
                message="Dangerous query detected. Please review and confirm execution.",
                executionTimeMs=0,
                warnings=all_warnings,
                isDangerous=True
            )
        
        # Handle multiple statements
        if len(statements) > 1:
            if not allow_multiple:
                return QueryResult(
                    type="error",
                    message="Multiple statements detected. Enable 'Allow Multiple Statements' to execute.",
                    executionTimeMs=0,
                    warnings=["Multiple SQL statements found in query"]
                )
            
            return self._execute_multiple_statements(statements, page, page_size)
        
        # Single statement
        return self.execute_single_statement(statements[0], page, page_size)
    
    def _execute_multiple_statements(self, statements: List[str], page: int, page_size: int) -> QueryResult:
        """Execute multiple SQL statements"""
        start_time = time.time()
        results = []
        total_affected = 0
        
        for i, stmt in enumerate(statements):
            result = self.execute_single_statement(stmt, page if i == len(statements) - 1 else 1, page_size)
            results.append(result)
            
            if result.type == "error":
                # Stop execution on error
                break
                
            if result.affectedRows:
                total_affected += result.affectedRows
        
        execution_time = (time.time() - start_time) * 1000
        
        # Return summary result for multiple statements
        last_result = results[-1] if results else None
        
        return QueryResult(
            type="multi",
            queryType="multiple",
            executionTimeMs=execution_time,
            message=f"Executed {len(results)} statements successfully",
            affectedRows=total_affected if total_affected > 0 else None,
            results=results,
            # If last statement was SELECT, include its data
            columns=last_result.columns if last_result and last_result.type == "select" else None,
            rows=last_result.rows if last_result and last_result.type == "select" else None,
            rowCount=last_result.rowCount if last_result and last_result.type == "select" else None,
            totalRows=last_result.totalRows if last_result and last_result.type == "select" else None,
            page=last_result.page if last_result and last_result.type == "select" else None,
            pageSize=last_result.pageSize if last_result and last_result.type == "select" else None,
            totalPages=last_result.totalPages if last_result and last_result.type == "select" else None,
        )
