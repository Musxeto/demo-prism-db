from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
import schemas, storage, models
from database import SessionLocal, engine
import sqlite3
from typing import List, Optional
from fastapi import Query
import time

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/connections", response_model=list[schemas.Connection])
def read_connections(db: Session = Depends(get_db)):
    return storage.get_connections(db)

@app.get("/api/connections/{connection_id}", response_model=schemas.Connection)
def read_connection(connection_id: int, db: Session = Depends(get_db)):
    db_connection = storage.get_connection(db=db, connection_id=connection_id)
    if db_connection is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    return db_connection

@app.post("/api/connections", response_model=schemas.Connection)
def create_connection(connection: schemas.ConnectionCreate, db: Session = Depends(get_db)):
    return storage.create_connection(db=db, connection=connection)
    
@app.post("/api/connections/test")
def test_connection(connection: schemas.ConnectionCreate):
    try:
        result = storage.test_connection_without_saving(connection)
        if result[0]:
            return {"success": True, "message": "Connection successful"}
        else:
            raise HTTPException(status_code=400, detail=result[1])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/connections/{connection_id}", response_model=schemas.Connection)
def update_connection(connection_id: int, connection: schemas.ConnectionUpdate, db: Session = Depends(get_db)):
    db_connection = storage.update_connection(db=db, connection_id=connection_id, connection=connection)
    if db_connection is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    return db_connection

@app.delete("/api/connections/{connection_id}")
def delete_connection(connection_id: int, db: Session = Depends(get_db)):
    db_connection = storage.get_connection(db=db, connection_id=connection_id)
    if db_connection is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    storage.delete_connection(db=db, connection_id=connection_id)
    return {"message": "Connection deleted successfully"}

@app.get("/api/connections/{connection_id}/schema", response_model=schemas.DatabaseSchema)
def get_connection_schema(connection_id: int, db: Session = Depends(get_db)):
    print(f"Fetching schema for connection_id: {connection_id}")
    schema = storage.get_schema(db, connection_id=connection_id)
    print(f"Schema result: {schema}")
    if schema is None:
        print(f"Connection {connection_id} not found in database")
        raise HTTPException(status_code=404, detail="Connection not found")
    if "error" in schema:
        print(f"Error in schema: {schema['error']}")
        raise HTTPException(status_code=400, detail=schema["error"])
    return schema

@app.get("/api/connections/{connection_id}/relationships", response_model=schemas.DatabaseRelationships)
def get_connection_relationships(connection_id: int, db: Session = Depends(get_db)):
    print(f"Fetching relationships for connection_id: {connection_id}")
    relationships = storage.get_relationships(db, connection_id=connection_id)
    print(f"Relationships result: {relationships}")
    if relationships is None:
        print(f"Connection {connection_id} not found in database")
        raise HTTPException(status_code=404, detail="Connection not found")
    if "error" in relationships:
        print(f"Error in relationships: {relationships['error']}")
        raise HTTPException(status_code=400, detail=relationships["error"])
    return relationships

@app.post("/api/connections/{connection_id}/query")
def run_query(connection_id: int, query: schemas.QueryRequest, db: Session = Depends(get_db)):
    start_time = time.time()
    try:
        result = storage.execute_query(
            db, 
            connection_id, 
            query.sql, 
            query.page, 
            query.pageSize,
            query.allowMultiple,
            query.confirmDangerous
        )
        execution_time_ms = int((time.time() - start_time) * 1000)
        log_query_to_db(connection_id, query.sql, True, None, execution_time_ms, query.tabId)
        return result
    except Exception as e:
        execution_time_ms = int((time.time() - start_time) * 1000)
        log_query_to_db(connection_id, query.sql, False, str(e), execution_time_ms, query.tabId)
        raise HTTPException(status_code=400, detail=str(e))

@app.post('/api/logs/actions', status_code=201)
def log_action(action: schemas.ActionLogCreate):
    try:
        log_action_to_db(action.action_type, action.details)
        return {"message": "Action logged successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log action: {str(e)}")

@app.get("/api/queries", response_model=list[schemas.Query])
def read_queries(db: Session = Depends(get_db)):
    return storage.get_queries(db)

@app.post("/api/connections/test-and-load", response_model=schemas.DatabaseSchemaResponse)
def test_and_load_connection(connection_test: schemas.ConnectionTest):
    try:
        return storage.test_and_load_schema(connection_test)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

DB_PATH = 'logs.db'

def log_query_to_db(connection_id: int, sql: str, success: bool, error_message: str = None, execution_time_ms: int = 0, tab_id: str = None):
    query_type = sql.strip().split()[0].upper()
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute(
                """
                INSERT INTO query_logs (connection_id, query, query_type, success, error_message, execution_time_ms, tab_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (connection_id, sql, query_type, success, error_message, execution_time_ms, tab_id)
            )
    except Exception as e:
        print(f"Failed to log query: {e}")

def log_action_to_db(action_type: str, details: dict = None):
    import json
    details_json = json.dumps(details) if details else None
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute(
                "INSERT INTO action_logs (action_type, details) VALUES (?, ?)",
                (action_type, details_json)
            )
    except Exception as e:
        print(f"Failed to log action: {e}")

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

@app.get('/api/logs/queries')
def get_query_logs() -> List[dict]:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = dict_factory
        cur = conn.cursor()
        cur.execute('SELECT * FROM query_logs ORDER BY created_at DESC LIMIT 100')
        return cur.fetchall()

@app.get('/api/logs/actions')
def get_action_logs() -> List[dict]:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = dict_factory
        cur = conn.cursor()
        cur.execute('SELECT * FROM action_logs ORDER BY created_at DESC LIMIT 100')
        return cur.fetchall()

# Saved Queries API endpoints
@app.get("/api/saved-queries", response_model=schemas.SavedQueryListResponse)
def get_saved_queries(
    connection_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    return storage.get_saved_queries(db, connection_id, category, search, skip, limit)

@app.get("/api/saved-queries/{query_id}", response_model=schemas.SavedQuery)
def get_saved_query(query_id: int, db: Session = Depends(get_db)):
    saved_query = storage.get_saved_query(db, query_id)
    if not saved_query:
        raise HTTPException(status_code=404, detail="Saved query not found")
    return saved_query

@app.post("/api/saved-queries", response_model=schemas.SavedQuery)
def create_saved_query(saved_query: schemas.SavedQueryCreate, db: Session = Depends(get_db)):
    return storage.create_saved_query(db, saved_query)

@app.put("/api/saved-queries/{query_id}", response_model=schemas.SavedQuery)
def update_saved_query(query_id: int, saved_query: schemas.SavedQueryUpdate, db: Session = Depends(get_db)):
    updated_query = storage.update_saved_query(db, query_id, saved_query)
    if not updated_query:
        raise HTTPException(status_code=404, detail="Saved query not found")
    return updated_query

@app.delete("/api/saved-queries/{query_id}")
def delete_saved_query(query_id: int, db: Session = Depends(get_db)):
    success = storage.delete_saved_query(db, query_id)
    if not success:
        raise HTTPException(status_code=404, detail="Saved query not found")
    return {"message": "Saved query deleted successfully"}

@app.post("/api/saved-queries/{query_id}/toggle-favorite", response_model=schemas.SavedQuery)
def toggle_saved_query_favorite(query_id: int, db: Session = Depends(get_db)):
    saved_query = storage.toggle_saved_query_favorite(db, query_id)
    if not saved_query:
        raise HTTPException(status_code=404, detail="Saved query not found")
    return saved_query


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)

