from sqlalchemy.orm import Session
from typing import Tuple
import models, schemas
import mysql.connector
from db_connectors import create_connector

def get_connections(db: Session):
    return db.query(models.Connection).all()

def get_connection(db: Session, connection_id: int):
    # Get the connection from database
    db_conn = db.query(models.Connection).filter(models.Connection.id == connection_id).first()
    
    # If found, ensure database_type attribute is correctly mapped to databaseType for API use
    if db_conn and hasattr(db_conn, "database_type"):
        # Set attribute explicitly for access in other functions
        db_conn.databaseType = db_conn.database_type
        print(f"Connection #{db_conn.id} database type: {db_conn.database_type} (mapped to databaseType: {db_conn.databaseType})")
    
    return db_conn

def create_connection(db: Session, connection: schemas.ConnectionCreate):
    # Convert connection data to dict and map camelCase to snake_case for database_type
    connection_data = connection.model_dump()
    
    # Map databaseType to database_type if present
    if "databaseType" in connection_data:
        db_type = connection_data.pop("databaseType")
        print(f"Creating connection with databaseType: {db_type}")
        connection_data["database_type"] = db_type
    else:
        print("Warning: databaseType not provided in connection data")
    
    db_connection = models.Connection(**connection_data)
    db.add(db_connection)
    db.commit()
    db.refresh(db_connection)
    
    # For API consistency, add databaseType attribute to match what the API expects
    if hasattr(db_connection, "database_type"):
        db_connection.databaseType = db_connection.database_type
        print(f"Created connection with database_type: {db_connection.database_type} (mapped to databaseType: {db_connection.databaseType})")
    
    return db_connection

def update_connection(db: Session, connection_id: int, connection: schemas.ConnectionUpdate):
    db_connection = get_connection(db, connection_id)
    if not db_connection:
        return None
    
    update_data = connection.model_dump(exclude_unset=True)
    
    # Map databaseType to database_type if present
    if "databaseType" in update_data:
        update_data["database_type"] = update_data.pop("databaseType")
    
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

def test_connection_without_saving(connection: schemas.ConnectionCreate) -> Tuple[bool, str]:
    """Test database connection without saving to database
    
    Args:
        connection: Connection details to test
        
    Returns:
        Tuple of (success: bool, message: str)
    """
    try:
        # Convert connection data to proper format for connector
        connection_data = connection.model_dump()
        
        # Map databaseType to database_type for the connector
        db_type = connection_data.pop("databaseType", "mysql")
        
        connection_config = {
            "host": connection_data.get("host"),
            "port": connection_data.get("port", 3306),
            "database": connection_data.get("database"),
            "username": connection_data.get("username"),
            "password": connection_data.get("password", ""),
            "database_type": db_type
        }
        
        # Create connector and test connection
        connector = create_connector(connection_config)
        success, message = connector.test_connection()
        
        # Clean up
        try:
            connector.disconnect()
        except:
            pass
            
        return success, message
    
    except Exception as e:
        return False, f"Connection test failed: {str(e)}"

def get_schema(db: Session, connection_id: int):
    connection = get_connection(db, connection_id)
    if not connection:
        return None
    
    try:
        from db_connectors import create_connector

        # Prepare connection config for the connector
        connection_config = {
            "host": connection.host,
            "port": connection.port,
            "database": connection.database,
            "username": connection.username,
            "password": connection.password,
            "database_type": connection.database_type if hasattr(connection, 'database_type') else "mysql"
        }

        # Create the appropriate connector
        connector = create_connector(connection_config)
        
        # Get schema using the connector
        schema_info = connector.get_schema()
        
        # Disconnect when done
        connector.disconnect()
        
        return schema_info
        
    except Exception as err:
        # Handle connection errors
        import traceback
        print(f"Error getting schema: {str(err)}")
        print(traceback.format_exc())
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
        'database_type': connection.database_type if hasattr(connection, 'database_type') else "mysql",
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
        from db_connectors import create_connector

        # Prepare connection config for the connector
        connection_config = {
            "host": connection_test.host,
            "port": connection_test.port,
            "database": connection_test.database,
            "username": connection_test.username,
            "password": connection_test.password,
            "database_type": connection_test.databaseType if hasattr(connection_test, 'databaseType') else "mysql"
        }
        
        # Print the database type for debugging
        print(f"Using database type: {connection_config['database_type']}")

        # Create the appropriate connector
        connector = create_connector(connection_config)
        
        # Test connection
        success, message = connector.test_connection()
        if not success:
            return {"error": message}
            
        # Get schema using the connector
        schema_info = connector.get_schema()
        
        # Extract relationships from schema
        relationships = []
        for table in schema_info["tables"]:
            for column in table["columns"]:
                if column["isForeignKey"] and column["references"]:
                    relationships.append({
                        "fromTable": table["tableName"],
                        "fromColumn": column["name"],
                        "toTable": column["references"]["table"],
                        "toColumn": column["references"]["column"],
                        "type": "many-to-one",  # Simplified relationship type
                    })
        
        # Disconnect when done
        connector.disconnect()
        
        return {
            "database": connection_test.database,
            "tables": schema_info["tables"],
            "relationships": relationships,
        }

    except Exception as err:
        import traceback
        print(f"Error in test_and_load_schema: {str(err)}")
        print(traceback.format_exc())
        return {"error": str(err)}

def get_relationships(db: Session, connection_id: int):
    """Extract foreign key relationships from database schema"""
    connection = get_connection(db, connection_id)
    if not connection:
        return None
    
    try:
        from db_connectors import create_connector

        # Prepare connection config for the connector
        connection_config = {
            "host": connection.host,
            "port": connection.port,
            "database": connection.database,
            "username": connection.username,
            "password": connection.password,
            "database_type": connection.database_type if hasattr(connection, 'database_type') else "mysql"
        }

        # Create the appropriate connector
        connector = create_connector(connection_config)
        
        # Get schema using the connector
        schema_info = connector.get_schema()
        
        tables = []
        relationships = []
        
        # Process each table in the schema
        for table in schema_info["tables"]:
            table_name = table["tableName"]
            primary_keys = []
            foreign_keys = []
            columns = []
            
            # Process columns
            for column in table["columns"]:
                column_name = column["name"]
                
                if column["isPrimaryKey"]:
                    primary_keys.append(column_name)
                
                if column["isForeignKey"] and column["references"]:
                    foreign_keys.append({
                        "column": column_name,
                        "references": column["references"]
                    })
                    
                    # Add to relationships list
                    relationships.append({
                        "fromTable": table_name,
                        "fromColumn": column_name,
                        "toTable": column["references"]["table"],
                        "toColumn": column["references"]["column"],
                        "type": "foreign_key",
                        "constraintName": f"fk_{table_name}_{column_name}"  # Generic constraint name
                    })
                
                columns.append({
                    "name": column_name,
                    "type": column["type"],
                    "nullable": column["nullable"],
                    "isPrimaryKey": column["isPrimaryKey"],
                    "isForeignKey": column["isForeignKey"],
                    "references": column["references"]
                })
            
            tables.append({
                "name": table_name,
                "rowCount": table["rowCount"],
                "columns": columns,
                "primaryKeys": primary_keys,
                "foreignKeys": foreign_keys
            })
        
        # Disconnect when done
        connector.disconnect()
        return {
            "database": connection.database,
            "tables": tables,
            "relationships": relationships
        }
    except Exception as err:
        import traceback
        print(f"Error getting relationships: {str(err)}")
        print(traceback.format_exc())
        return {"error": str(err)}

# Saved Queries CRUD operations
def get_saved_queries(db: Session, connection_id: int = None, category: str = None, search: str = None, skip: int = 0, limit: int = 100):
    query = db.query(models.SavedQuery)
    
    if connection_id:
        query = query.filter(models.SavedQuery.connection_id == connection_id)
    
    if category:
        query = query.filter(models.SavedQuery.category == category)
    
    if search:
        query = query.filter(models.SavedQuery.name.contains(search) | models.SavedQuery.sql.contains(search))
    
    total = query.count()
    saved_queries = query.order_by(models.SavedQuery.updated_at.desc()).offset(skip).limit(limit).all()
    
    # Get all unique categories
    categories = db.query(models.SavedQuery.category).distinct().all()
    categories = [cat[0] for cat in categories]
    
    return {
        "queries": saved_queries,
        "total": total,
        "categories": categories
    }

def get_saved_query(db: Session, query_id: int):
    return db.query(models.SavedQuery).filter(models.SavedQuery.id == query_id).first()

def create_saved_query(db: Session, saved_query: schemas.SavedQueryCreate):
    db_saved_query = models.SavedQuery(**saved_query.model_dump())
    db.add(db_saved_query)
    db.commit()
    db.refresh(db_saved_query)
    return db_saved_query

def update_saved_query(db: Session, query_id: int, saved_query: schemas.SavedQueryUpdate):
    db_saved_query = get_saved_query(db, query_id)
    if not db_saved_query:
        return None
    
    update_data = saved_query.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_saved_query, field, value)
    
    db.commit()
    db.refresh(db_saved_query)
    return db_saved_query

def delete_saved_query(db: Session, query_id: int):
    db_saved_query = get_saved_query(db, query_id)
    if db_saved_query:
        db.delete(db_saved_query)
        db.commit()
        return True
    return False

def toggle_saved_query_favorite(db: Session, query_id: int):
    db_saved_query = get_saved_query(db, query_id)
    if not db_saved_query:
        return None
    
    db_saved_query.is_favorite = not db_saved_query.is_favorite
    db.commit()
    db.refresh(db_saved_query)
    return db_saved_query
