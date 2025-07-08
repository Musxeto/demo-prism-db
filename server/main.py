from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
import schemas, storage, models
from database import SessionLocal, engine

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

@app.post("/api/connections", response_model=schemas.Connection)
def create_connection(connection: schemas.ConnectionCreate, db: Session = Depends(get_db)):
    return storage.create_connection(db=db, connection=connection)

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
    try:
        return storage.execute_query(db, connection_id, query.sql, query.page, query.pageSize)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/queries", response_model=list[schemas.Query])
def read_queries(db: Session = Depends(get_db)):
    return storage.get_queries(db)

@app.post("/api/connections/test-and-load", response_model=schemas.DatabaseSchemaResponse)
def test_and_load_connection(connection_test: schemas.ConnectionTest):
    try:
        return storage.test_and_load_schema(connection_test)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)

