# Database Studio Backend

## Overview

This is a FastAPI-based backend service for the Database Studio application. It provides a REST API that enables users to connect to multiple database types, execute SQL queries, manage database connections, and perform various database operations through a web interface.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Database Studio Backend                  │
├─────────────────────────────────────────────────────────────┤
│  FastAPI Application Layer (main.py)                       │
│  ├── REST API Endpoints                                    │
│  ├── CORS Middleware                                       │
│  └── Request/Response Handling                             │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                      │
│  ├── SQL Query Engine (sql_engine.py)                     │
│  ├── Data Storage Operations (storage.py)                 │
│  └── Query History & Saved Queries                        │
├─────────────────────────────────────────────────────────────┤
│  Data Access Layer                                         │
│  ├── Database Connectors (db_connectors.py)              │
│  ├── SQLAlchemy Models (models.py)                        │
│  └── Pydantic Schemas (schemas.py)                        │
├─────────────────────────────────────────────────────────────┤
│  Database Layer                                            │
│  ├── SQLite (Application Metadata)                        │
│  └── External Databases (MySQL, PostgreSQL, MSSQL, etc.) │
└─────────────────────────────────────────────────────────────┘
```

## 📁 File Structure & Components

### Core Application Files

#### `main.py` - FastAPI Application Entry Point
- **Purpose**: Main FastAPI application with all API endpoints
- **Key Features**:
  - REST API endpoints for database operations
  - CORS middleware configuration
  - Database connection management endpoints
  - Query execution endpoints
  - Query history and saved queries management
- **Dependencies**: FastAPI, SQLAlchemy, other core modules

#### `database.py` - Database Configuration
- **Purpose**: SQLAlchemy database configuration and session management
- **Key Features**:
  - SQLite database connection for application metadata
  - Session factory for database operations
  - Base class for SQLAlchemy models
- **Database**: Uses SQLite (`sql_app1.db`) for storing application metadata

#### `models.py` - SQLAlchemy Data Models
- **Purpose**: Defines database schema using SQLAlchemy ORM
- **Key Models**:
  - `Connection`: Database connection configurations
  - `Query`: Query execution history
  - `SavedQuery`: User-saved queries for reuse
- **Relationships**: Establishes foreign key relationships between models

#### `schemas.py` - Pydantic Data Schemas
- **Purpose**: Data validation and serialization using Pydantic
- **Key Schemas**:
  - Request/Response models for API endpoints
  - Data validation for database connections
  - Query result structures
- **Features**: Type validation, field aliases, optional parameters

### Database Connectivity Layer

#### `db_connectors.py` - Multi-Database Connector
- **Purpose**: Unified interface for connecting to different database types
- **Supported Databases**:
  - **MySQL** (via mysql-connector-python)
  - **PostgreSQL** (via psycopg2)
  - **Microsoft SQL Server** (via pyodbc)
  - **SQLite** (via sqlite3)
  - **MongoDB** (via pymongo)
- **Key Features**:
  - Abstract base class for consistent interface
  - Database-specific connection handling
  - Error handling and connection validation
  - Schema introspection capabilities

#### `sql_engine.py` - SQL Query Execution Engine
- **Purpose**: Advanced SQL query processing and execution
- **Key Features**:
  - **Query Safety**: Detects dangerous SQL patterns (DROP, TRUNCATE, etc.)
  - **Statement Classification**: Identifies query types (SELECT, INSERT, UPDATE, etc.)
  - **Result Processing**: Handles different types of query results
  - **Error Handling**: Comprehensive error reporting
  - **Performance Monitoring**: Query execution timing

### Data Management Layer

#### `storage.py` - Data Access Operations
- **Purpose**: Business logic for database operations and data persistence
- **Key Functions**:
  - Connection CRUD operations
  - Query history management
  - Saved queries operations
  - Database schema introspection
- **Integration**: Works with both application database and external databases

#### `logs_api.py` - Logging and Monitoring
- **Purpose**: Application logging and monitoring capabilities
- **Features**:
  - Query execution logging
  - Performance metrics
  - Error tracking
  - Audit trail for database operations

### Configuration Files

#### `requirements.txt` - Python Dependencies
- **Core Framework**: FastAPI, Uvicorn
- **Database Drivers**: 
  - `mysql-connector-python` - MySQL connectivity
  - `psycopg2-binary` - PostgreSQL connectivity
  - `pyodbc` - SQL Server connectivity
  - `pymongo` - MongoDB connectivity
- **ORM & Validation**: SQLAlchemy, Pydantic
- **Utilities**: python-dotenv, PyYAML

## 🔧 Key Features

### 1. Multi-Database Support
- Connect to MySQL, PostgreSQL, SQL Server, SQLite, and MongoDB
- Database-specific optimizations and features
- Unified query interface across different database types

### 2. Query Safety & Validation
- Automatic detection of potentially dangerous SQL operations
- Query syntax validation before execution
- Configurable safety checks and confirmations

### 3. Query Management
- Execute ad-hoc SQL queries
- Save frequently used queries
- Query execution history with timestamps
- Result caching and pagination

### 4. Schema Exploration
- Browse database schemas, tables, and columns
- View table structures and relationships
- Database metadata introspection

### 5. Connection Management
- Store and manage multiple database connections
- Connection testing and validation
- Secure credential storage

## 🚀 API Endpoints Overview

### Connection Management
- `GET /connections` - List all saved connections
- `POST /connections` - Create new database connection
- `PUT /connections/{id}` - Update existing connection
- `DELETE /connections/{id}` - Remove connection
- `POST /connections/{id}/test` - Test connection validity

### Query Execution
- `POST /connections/{id}/execute` - Execute SQL query
- `GET /connections/{id}/schema` - Get database schema
- `GET /connections/{id}/tables` - List database tables

### Query History & Management
- `GET /queries` - Get query execution history
- `POST /saved-queries` - Save a query for reuse
- `GET /saved-queries` - List saved queries
- `DELETE /saved-queries/{id}` - Remove saved query

## 🛠️ Technology Stack

- **Framework**: FastAPI (High-performance async web framework)
- **ORM**: SQLAlchemy (Database toolkit and ORM)
- **Validation**: Pydantic (Data validation using Python type annotations)
- **Database**: SQLite (Application metadata storage)
- **Drivers**: Multi-database support with specialized drivers
- **Server**: Uvicorn (ASGI server implementation)

## 📊 Data Flow

1. **Client Request** → FastAPI endpoint receives HTTP request
2. **Validation** → Pydantic schemas validate incoming data
3. **Business Logic** → Storage layer processes the request
4. **Database Operation** → Appropriate connector executes database operation
5. **Result Processing** → SQL engine processes and formats results
6. **Response** → Formatted response sent back to client
7. **Logging** → Operation logged for audit and monitoring

## 🔒 Security Considerations

- Database credentials are stored securely
- SQL injection protection through parameterized queries
- Dangerous operation detection and confirmation
- CORS configuration for web client security
- Input validation at multiple layers

## 🧪 Development & Testing

- Modular architecture enables easy testing of individual components
- Abstract interfaces allow for mock implementations
- Comprehensive error handling and logging
- Type hints throughout for better IDE support and validation

This backend provides a robust, scalable foundation for database management operations while maintaining security and performance standards.
