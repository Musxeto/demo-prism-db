from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ConnectionBase(BaseModel):
    name: str
    host: str
    port: int
    database: str
    username: str
    password: str

class ConnectionCreate(ConnectionBase):
    pass

class ConnectionUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class Connection(ConnectionBase):
    id: int
    is_active: Optional[bool] = True
    created_at: datetime

    class Config:
        from_attributes = True

class QueryBase(BaseModel):
    sql: str

class QueryCreate(QueryBase):
    pass

class Query(QueryBase):
    id: int
    connection_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class DatabaseSchema(BaseModel):
    tables: list

class QueryRequest(BaseModel):
    sql: str
    page: Optional[int] = 1
    pageSize: Optional[int] = 100

class QueryResult(BaseModel):
    columns: Optional[List[Dict[str, str]]] = None
    rows: Optional[List[List]] = None
    rowCount: Optional[int] = None
    totalRows: Optional[int] = None
    page: Optional[int] = None
    pageSize: Optional[int] = None
    totalPages: Optional[int] = None
    executionTimeMs: float
    message: Optional[str] = None


class ConnectionTest(BaseModel):
    host: str
    port: int
    database: str
    username: str
    password: str


class ColumnSchema(BaseModel):
    name: str
    type: str
    nullable: bool
    isPrimaryKey: bool
    isForeignKey: bool
    references: Optional[Dict[str, str]] = None


class TableSchema(BaseModel):
    tableName: str
    rowCount: int
    columns: List[ColumnSchema]
    sampleRows: List[Dict[str, Any]]


class RelationshipSchema(BaseModel):
    fromTable: str
    fromColumn: str
    toTable: str
    toColumn: str
    type: str


class DatabaseSchemaResponse(BaseModel):
    database: str
    tables: List[TableSchema]
    relationships: List[RelationshipSchema]

class DatabaseRelationships(BaseModel):
    database: str
    tables: List[Dict[str, Any]]
    relationships: List[Dict[str, str]]
