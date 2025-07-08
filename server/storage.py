from sqlalchemy.orm import Session
import models, schemas
import mysql.connector

def get_connections(db: Session):
    return db.query(models.Connection).all()

def get_connection(db: Session, connection_id: int):
    return db.query(models.Connection).filter(models.Connection.id == connection_id).first()

def create_connection(db: Session, connection: schemas.ConnectionCreate):
    db_connection = models.Connection(**connection.dict())
    db.add(db_connection)
    db.commit()
    db.refresh(db_connection)
    return db_connection

def update_connection(db: Session, connection_id: int, connection: schemas.ConnectionUpdate):
    db_connection = get_connection(db, connection_id)
    if not db_connection:
        return None
    update_data = connection.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_connection, key, value)
    db.add(db_connection)
    db.commit()
    db.refresh(db_connection)
    return db_connection

def delete_connection(db: Session, connection_id: int):
    db_connection = get_connection(db, connection_id)
    if db_connection:
        db.delete(db_connection)
        db.commit()
    return

def get_schema(db: Session, connection_id: int):
    connection = get_connection(db, connection_id)
    if not connection:
        return None
    
    try:
        mydb = mysql.connector.connect(
            host=connection.host,
            user=connection.username,
            password=connection.password,
            database=connection.database
        )
        cursor = mydb.cursor()
        
        # Get all table names
        cursor.execute("SHOW TABLES")
        table_names = [table[0] for table in cursor.fetchall()]
        
        tables = []
        for table_name in table_names:
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
            row_count = cursor.fetchone()[0]
            
            # Get column information
            cursor.execute(f"DESCRIBE `{table_name}`")
            columns_info = cursor.fetchall()
            
            columns = []
            for col_info in columns_info:
                columns.append({
                    "name": col_info[0],
                    "type": col_info[1],
                    "nullable": col_info[2] == "YES",
                    "isPrimaryKey": col_info[3] == "PRI",
                    "isForeignKey": False  # Would need additional query to determine this
                })
            
            tables.append({
                "name": table_name,
                "rowCount": row_count,
                "columns": columns
            })
        
        mydb.close()
        return {
            "name": connection.database,
            "tables": tables
        }
    except mysql.connector.Error as err:
        # Handle connection errors
        return {"error": str(err)}


def execute_query(db: Session, connection_id: int, sql: str, page: int = 1, page_size: int = 100):
    import time
    import re
    
    connection = get_connection(db, connection_id)
    if not connection:
        raise Exception("Connection not found")

    # Validate that only SELECT queries are allowed for now
    sql_stripped = sql.strip().upper()
    if not sql_stripped.startswith('SELECT'):
        raise Exception("Only SELECT queries are allowed in this version")

    try:
        mydb = mysql.connector.connect(
            host=connection.host,
            user=connection.username,
            password=connection.password,
            database=connection.database
        )
        cursor = mydb.cursor()
        
        # Track execution time
        start_time = time.time()
        
        # First, get the total count for SELECT queries
        total_rows = None
        if sql_stripped.startswith('SELECT'):
            # Create a count query by wrapping the original query
            count_sql = f"SELECT COUNT(*) FROM ({sql}) AS count_query"
            try:
                cursor.execute(count_sql)
                total_rows = cursor.fetchone()[0]
            except mysql.connector.Error:
                # If count query fails, we'll execute without count
                total_rows = None
        
        # Add pagination to the original query
        paginated_sql = sql
        if page > 0 and page_size > 0:
            offset = (page - 1) * page_size
            # Check if query already has LIMIT clause
            if not re.search(r'\bLIMIT\b', sql_stripped):
                paginated_sql = f"{sql} LIMIT {page_size} OFFSET {offset}"
            else:
                # If LIMIT already exists, replace it with paginated version
                paginated_sql = re.sub(
                    r'\bLIMIT\s+\d+(\s+OFFSET\s+\d+)?\s*$', 
                    f'LIMIT {page_size} OFFSET {offset}', 
                    sql, 
                    flags=re.IGNORECASE
                )
        
        cursor.execute(paginated_sql)
        
        if cursor.with_rows:
            # Get column information
            columns = [{"name": desc[0], "type": str(desc[1])} for desc in cursor.description]
            rows = cursor.fetchall()
            execution_time = round((time.time() - start_time) * 1000, 2)  # Convert to milliseconds
            
            # Convert rows to list of lists for JSON serialization
            serialized_rows = []
            for row in rows:
                serialized_row = []
                for value in row:
                    if value is None:
                        serialized_row.append(None)
                    elif isinstance(value, (int, float, str, bool)):
                        serialized_row.append(value)
                    else:
                        # Convert other types (datetime, decimal, etc.) to string
                        serialized_row.append(str(value))
                serialized_rows.append(serialized_row)
            
            mydb.close()
            
            # Save query to history
            db.add(models.Query(connection_id=connection_id, sql=sql))
            db.commit()
            
            # Calculate pagination info
            total_pages = None
            if total_rows is not None and page_size > 0:
                total_pages = (total_rows + page_size - 1) // page_size
            
            return {
                "columns": columns,
                "rows": serialized_rows,
                "rowCount": len(serialized_rows),
                "totalRows": total_rows,
                "page": page,
                "pageSize": page_size,
                "totalPages": total_pages,
                "executionTimeMs": execution_time
            }
        else:
            execution_time = round((time.time() - start_time) * 1000, 2)
            mydb.close()
            db.add(models.Query(connection_id=connection_id, sql=sql))
            db.commit()
            return {
                "message": "Query executed successfully.",
                "executionTimeMs": execution_time
            }

    except mysql.connector.Error as err:
        raise Exception(str(err))

def get_queries(db: Session):
    return db.query(models.Query).all()


def test_and_load_schema(connection_test: schemas.ConnectionTest):
    try:
        mydb = mysql.connector.connect(
            host=connection_test.host,
            user=connection_test.username,
            password=connection_test.password,
            database=connection_test.database,
        )
        cursor = mydb.cursor(dictionary=True)

        # Get all table names
        cursor.execute("SHOW TABLES")
        tables = [table[f"Tables_in_{connection_test.database}"] for table in cursor.fetchall()]

        response_tables = []
        relationships = []

        for table_name in tables:
            # Get columns details
            cursor.execute(f"""
                SELECT
                    c.COLUMN_NAME as `name`,
                    c.COLUMN_TYPE as `type`,
                    (c.IS_NULLABLE = 'YES') as `nullable`,
                    IF(kcu.CONSTRAINT_NAME = 'PRIMARY', TRUE, FALSE) as `isPrimaryKey`,
                    IF(kcu.REFERENCED_TABLE_NAME IS NOT NULL, TRUE, FALSE) as `isForeignKey`,
                    kcu.REFERENCED_TABLE_NAME as `referencedTable`,
                    kcu.REFERENCED_COLUMN_NAME as `referencedColumn`
                FROM
                    INFORMATION_SCHEMA.COLUMNS c
                LEFT JOIN
                    INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                ON
                    c.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND c.TABLE_NAME = kcu.TABLE_NAME AND c.COLUMN_NAME = kcu.COLUMN_NAME
                WHERE
                    c.TABLE_SCHEMA = '{connection_test.database}' AND c.TABLE_NAME = '{table_name}'
            """)
            columns_data = cursor.fetchall()

            columns = []
            for col in columns_data:
                references = None
                if col['isForeignKey']:
                    references = {
                        "table": col['referencedTable'],
                        "column": col['referencedColumn'],
                    }
                    relationships.append(
                        {
                            "fromTable": table_name,
                            "fromColumn": col['name'],
                            "toTable": col['referencedTable'],
                            "toColumn": col['referencedColumn'],
                            "type": "many-to-one",  # This is a simplification
                        }
                    )
                columns.append(
                    {
                        "name": col['name'],
                        "type": col['type'],
                        "nullable": bool(col['nullable']),
                        "isPrimaryKey": bool(col['isPrimaryKey']),
                        "isForeignKey": bool(col['isForeignKey']),
                        "references": references,
                    }
                )

            # Get row count
            cursor.execute(f"SELECT COUNT(*) as count FROM `{table_name}`")
            row_count = cursor.fetchone()['count']

            # Get sample rows
            cursor.execute(f"SELECT * FROM `{table_name}` LIMIT 10")
            sample_rows = cursor.fetchall()

            response_tables.append(
                {
                    "tableName": table_name,
                    "rowCount": row_count,
                    "columns": columns,
                    "sampleRows": sample_rows,
                }
            )

        mydb.close()

        return {
            "database": connection_test.database,
            "tables": response_tables,
            "relationships": relationships,
        }

    except mysql.connector.Error as err:
        raise Exception(str(err))

def get_relationships(db: Session, connection_id: int):
    """Extract foreign key relationships from database schema"""
    connection = get_connection(db, connection_id)
    if not connection:
        return None
    
    try:
        mydb = mysql.connector.connect(
            host=connection.host,
            user=connection.username,
            password=connection.password,
            database=connection.database
        )
        cursor = mydb.cursor()
        
        # Get all table names
        cursor.execute("SHOW TABLES")
        table_names = [table[0] for table in cursor.fetchall()]
        
        tables = []
        relationships = []
        
        for table_name in table_names:
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
            row_count = cursor.fetchone()[0]
            
            # Get column information with foreign key details
            cursor.execute(f"""
                SELECT 
                    c.COLUMN_NAME,
                    c.DATA_TYPE,
                    c.IS_NULLABLE,
                    c.COLUMN_KEY,
                    kcu.REFERENCED_TABLE_NAME,
                    kcu.REFERENCED_COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS c
                LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
                    ON c.TABLE_SCHEMA = kcu.TABLE_SCHEMA 
                    AND c.TABLE_NAME = kcu.TABLE_NAME 
                    AND c.COLUMN_NAME = kcu.COLUMN_NAME
                    AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
                WHERE c.TABLE_SCHEMA = %s AND c.TABLE_NAME = %s
                ORDER BY c.ORDINAL_POSITION
            """, (connection.database, table_name))
            
            columns_info = cursor.fetchall()
            primary_keys = []
            foreign_keys = []
            columns = []
            
            for col_info in columns_info:
                column_name, data_type, is_nullable, column_key, ref_table, ref_column = col_info
                
                is_primary = column_key == "PRI"
                is_foreign = ref_table is not None
                
                if is_primary:
                    primary_keys.append(column_name)
                
                if is_foreign:
                    foreign_key = {
                        "column": column_name,
                        "references": {
                            "table": ref_table,
                            "column": ref_column
                        }
                    }
                    foreign_keys.append(foreign_key)
                    
                    # Add to relationships list
                    relationships.append({
                        "fromTable": table_name,
                        "fromColumn": column_name,
                        "toTable": ref_table,
                        "toColumn": ref_column,
                        "type": "foreign_key"
                    })
                
                columns.append({
                    "name": column_name,
                    "type": data_type,
                    "nullable": is_nullable == "YES",
                    "isPrimaryKey": is_primary,
                    "isForeignKey": is_foreign,
                    "references": {"table": ref_table, "column": ref_column} if is_foreign else None
                })
            
            tables.append({
                "name": table_name,
                "rowCount": row_count,
                "columns": columns,
                "primaryKeys": primary_keys,
                "foreignKeys": foreign_keys
            })
        
        mydb.close()
        return {
            "database": connection.database,
            "tables": tables,
            "relationships": relationships
        }
    except mysql.connector.Error as err:
        return {"error": str(err)}
