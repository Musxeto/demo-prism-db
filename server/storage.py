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


def execute_query(db: Session, connection_id: int, sql: str, page: int = 1, page_size: int = 10, 
                 allow_multiple: bool = False, confirm_dangerous: bool = False):
    from sql_engine import SQLQueryEngine
    
    connection = get_connection(db, connection_id)
    if not connection:
        raise Exception("Connection not found")

    # Prepare connection config for the SQL engine
    connection_config = {
        'host': connection.host,
        'port': connection.port,
        'database': connection.database,
        'user': connection.username,
        'password': connection.password,
        'autocommit': False,
        'raise_on_warnings': True
    }
    
    try:
        # Initialize SQL engine
        engine = SQLQueryEngine(connection_config)
        
        # Execute query using the enhanced SQL engine
        result = engine.execute_query(
            sql=sql,
            page=page,
            page_size=page_size,
            allow_multiple=allow_multiple,
            confirm_dangerous=confirm_dangerous
        )
        
        # Save query to history (only for non-error results)
        if result.type != 'error':
            db.add(models.Query(connection_id=connection_id, sql=sql))
            db.commit()
        
        # Convert QueryResult to dict for FastAPI response
        return result.dict()
        
    except Exception as err:
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
        
        # First, get all foreign key relationships from the schema
        cursor.execute(f"""
            SELECT 
                kcu.TABLE_NAME,
                kcu.COLUMN_NAME,
                kcu.REFERENCED_TABLE_NAME,
                kcu.REFERENCED_COLUMN_NAME,
                kcu.CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
            WHERE kcu.TABLE_SCHEMA = %s
                AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
                AND kcu.REFERENCED_COLUMN_NAME IS NOT NULL
        """, (connection.database,))
        
        foreign_key_data = cursor.fetchall()
        print(f"Found {len(foreign_key_data)} foreign key relationships")
        for fk in foreign_key_data:
            print(f"FK: {fk}")
        
        # Build relationships list
        for fk_info in foreign_key_data:
            table_name, column_name, ref_table, ref_column, constraint_name = fk_info
            relationships.append({
                "fromTable": table_name,
                "fromColumn": column_name,
                "toTable": ref_table,
                "toColumn": ref_column,
                "type": "foreign_key",
                "constraintName": constraint_name
            })
        
        # Now get table and column information
        for table_name in table_names:
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
            row_count = cursor.fetchone()[0]
            
            # Get column information
            cursor.execute(f"""
                SELECT 
                    c.COLUMN_NAME,
                    c.DATA_TYPE,
                    c.IS_NULLABLE,
                    c.COLUMN_KEY,
                    c.EXTRA
                FROM INFORMATION_SCHEMA.COLUMNS c
                WHERE c.TABLE_SCHEMA = %s AND c.TABLE_NAME = %s
                ORDER BY c.ORDINAL_POSITION
            """, (connection.database, table_name))
            
            columns_info = cursor.fetchall()
            primary_keys = []
            foreign_keys = []
            columns = []
            
            for col_info in columns_info:
                column_name, data_type, is_nullable, column_key, extra = col_info
                
                is_primary = column_key == "PRI"
                
                # Check if this column is a foreign key by looking in our foreign_key_data
                is_foreign = False
                fk_reference = None
                for fk_info in foreign_key_data:
                    if fk_info[0] == table_name and fk_info[1] == column_name:
                        is_foreign = True
                        fk_reference = {
                            "table": fk_info[2],
                            "column": fk_info[3]
                        }
                        foreign_keys.append({
                            "column": column_name,
                            "references": fk_reference
                        })
                        break
                
                if is_primary:
                    primary_keys.append(column_name)
                
                columns.append({
                    "name": column_name,
                    "type": data_type,
                    "nullable": is_nullable == "YES",
                    "isPrimaryKey": is_primary,
                    "isForeignKey": is_foreign,
                    "references": fk_reference
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
