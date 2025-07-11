# Database Query Studio

A modern, full-stack database management platform built with React, FastAPI, and support for multiple database systems (MySQL, PostgreSQL, Microsoft SQL Server, SQLite, and MongoDB). This application provides a comprehensive interface for managing database connections, browsing schemas, executing queries, and analyzing results.

## 🚀 Quick Start Guide

### Prerequisites
Before running this application, make sure you have:
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download here](https://python.org/)
- **MySQL Server** (optional) - [Download here](https://dev.mysql.com/downloads/mysql/)
- **PostgreSQL** (optional) - [Download here](https://www.postgresql.org/download/)
- **Microsoft SQL Server** (optional) - [Download here](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
- **MongoDB** (optional) - [Download here](https://www.mongodb.com/try/download/community)
- **ODBC Drivers** (for SQL Server) - [Download here](https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)

### Step-by-Step Setup

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd MySqlReactFastApi
```

#### 2. Setup the Backend (FastAPI Server)
```bash
# Navigate to server directory
cd server

# Create and activate virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server (runs on port 5000)
python main.py
```
The backend server will start at `http://localhost:5000`

#### 3. Setup the Frontend (React App)
Open a new terminal window/tab and run:
```bash

cd ..

npm install

npm run dev
```
The frontend will start at `http://localhost:5173`

#### 4. Setup Your Database (Optional)
If you want to test with sample data:

For MySQL:
```bash
# Import the sample database (optional)
mysql -u root -p < sample_database_with_relationships.sql
```

For PostgreSQL:
```bash
# Create a database first
createdb sample_db
# Import the sample database (optional)
psql -U postgres -d sample_db -f sample_database_with_relationships.sql
```

For Microsoft SQL Server:
```bash
# Use SQL Server Management Studio (SSMS) or sqlcmd
# Import the sample database (optional)
sqlcmd -S server_name -d database_name -i sample_database_with_relationships.sql
```

For MongoDB:
```bash
# Use mongoimport for JSON data or MongoDB Compass for GUI
# Example: mongoimport --db sample_db --collection users --file sample_data.json
```

For SQLite:
```bash
# SQLite databases are created automatically when you connect
# No setup required - just specify a file path
```

### 🎯 Access the Application
1. **Frontend UI**: Open `http://localhost:5173` in your browser
2. **Backend API**: `http://localhost:5000` (API documentation at `/docs`)

### 🔧 Development Commands
```bash
# Frontend development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Backend development
cd server
# Activate virtual environment first
venv\Scripts\activate     # Windows
# source venv/bin/activate  # macOS/Linux
python main.py            # Start FastAPI server
python clear_db.py        # Clear application database (if needed)
```

### 🐛 Troubleshooting
- **Port conflicts**: If port 5173 or 5000 is busy, the apps will automatically use the next available port
- **Database connection issues**: 
  - For MySQL: Ensure MySQL server is running and you have the correct credentials
  - For PostgreSQL: Ensure PostgreSQL server is running and you have the correct credentials
  - For SQL Server: Ensure SQL Server is running and ODBC drivers are installed
  - For MongoDB: Ensure MongoDB service is running (mongod process)
  - For SQLite: Ensure the specified file path is accessible and writable
- **ODBC Driver Issues**: For SQL Server connections, install the latest ODBC Driver 17+ for SQL Server
- **Dependencies issues**: Delete `node_modules` and run `npm install` again for frontend, or recreate virtual environment for Python
- **CORS issues**: The backend is configured to allow localhost:5173 - make sure both servers are running
- **MongoDB Connection**: Use connection string format: `mongodb://username:password@host:port/database`
- **SQL Server Named Instances**: Use format: `DESKTOP-NAME\SQLEXPRESS` for named instances

## 🚀 Features Completed

### 🔗 Connection Management
- **Multiple Database Connections**: Support for managing multiple database connections across 5 database systems
- **Database Type Selection**: Choose between MySQL, PostgreSQL, Microsoft SQL Server, SQLite, and MongoDB when creating connections
- **Connection Creation Modal**: User-friendly interface for adding new database connections with database-specific fields
- **Connection Testing**: Built-in connection validation before saving with database-specific testing
- **Active Connection Switching**: Seamless switching between different database connections
- **Connection Persistence**: All connections are stored in SQLite database for persistence
- **Connection Settings**: Advanced connection settings modal for managing database configurations
- **Multi-Driver Support**: Automatic ODBC driver detection and fallback for SQL Server connections

### 🗂️ Schema Browser
- **Interactive Schema Navigation**: Collapsible tree view of database structure
- **Table Information Display**: Shows table names with row counts
- **Column Details**: Complete column information including:
  - Column names and data types
  - Primary key identification (blue indicator)
  - Data type categorization with color coding:
    - 🟢 Green: Numeric types (INT, DECIMAL)
    - 🟣 Purple: Date/Time types (TIMESTAMP, DATE)
    - 🔵 Blue: Primary keys
    - ⚪ Gray: Other types
- **Real-time Schema Refresh**: Ability to refresh schema information
- **Visual Indicators**: Color-coded column type indicators

### 📝 Query Editor
- **Monaco Editor Integration**: Professional code editor with SQL syntax highlighting
- **Multiple Query Tabs**: Support for multiple concurrent query tabs
- **Tab Management**: 
  - Create new query tabs
  - Close existing tabs
  - Switch between tabs
  - Persistent tab state
- **Pre-loaded Sample Queries**: Includes example queries for:
  - User analytics with advanced aggregations
  - Order reports
  - Product catalog with joins
- **SQL Execution**: Execute queries against selected database connections
- **Query Formatting**: Basic SQL formatting functionality
- **Real-time Status**: Connection status and execution state indicators

### 📊 Results Panel
- **Query Results Display**: Comprehensive results visualization using data tables
- **Performance Metrics**: Shows execution time and row count
- **Data Export Options**:
  - CSV export functionality
  - Copy to clipboard support
- **Error Handling**: Clear error messages for failed queries
- **Results Pagination**: Efficient handling of large result sets

### 🎨 User Interface
- **Modern Design**: Clean, professional interface with Tailwind CSS
- **Responsive Layout**: Adaptive design that works across different screen sizes
- **Dark/Light Theme Support**: Theme switching capabilities
- **Toast Notifications**: Real-time feedback for user actions
- **Loading States**: Visual feedback during data loading
- **Icon Integration**: Lucide React icons throughout the interface

### 🏗️ Technical Architecture

#### Frontend (React + TypeScript)
- **React Query**: Efficient data fetching and caching
- **Zustand**: State management for application state
- **Wouter**: Lightweight routing solution
- **React Hook Form**: Form handling and validation
- **Radix UI**: Accessible component primitives
- **Monaco Editor**: Professional code editing experience
- **Vite**: Fast development and build tooling

#### Backend (FastAPI + Python)
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: Robust ORM for database operations
- **Pydantic**: Data validation and settings management
- **Database Connectors**:
  - MySQL Connector: Native MySQL database connectivity using mysql-connector-python
  - PostgreSQL Connector: psycopg2-based PostgreSQL connectivity
  - Microsoft SQL Server Connector: pyodbc-based MSSQL connectivity with multi-driver support
  - SQLite Connector: Built-in SQLite database connectivity
  - MongoDB Connector: pymongo-based MongoDB connectivity (planned)
- **CORS Support**: Cross-origin resource sharing configuration
- **Multi-Driver Architecture**: Intelligent driver detection and fallback for SQL Server
- **Connection Pooling**: Efficient database connection management
- **API Endpoints**:
  - `GET /api/connections` - List all connections
  - `POST /api/connections` - Create new connection
  - `GET /api/connections/{id}/schema` - Get database schema
  - `POST /api/connections/{id}/query` - Execute SQL queries
  - `POST /api/connections/test-and-load` - Test connection and load schema

#### Database
- **SQLite**: Local storage for application data (connections, queries)
- **Target Databases**:
  - **MySQL**: Full support with native connector
  - **PostgreSQL**: Full support with psycopg2
  - **Microsoft SQL Server**: Full support with pyodbc and multi-driver compatibility
  - **SQLite**: Built-in support for file-based databases
  - **MongoDB**: Planned support with pymongo (document-based NoSQL)
- **Drizzle ORM**: Type-safe database schema definitions
- **Database Abstraction**: Connector pattern for unified database access across all systems
- **Schema Introspection**: Automated schema discovery for all supported database types
- **Foreign Key Detection**: Advanced relationship mapping for relational databases

### 🔧 Development Features
- **Hot Reload**: Development server with hot module replacement
- **Type Safety**: Full TypeScript implementation
- **Code Formatting**: Consistent code style enforcement
- **Error Boundaries**: Graceful error handling
- **Performance Optimization**: Efficient rendering and data loading

### 📦 Build System
- **Vite Configuration**: Optimized build configuration
- **ESBuild**: Fast JavaScript bundling
- **PostCSS**: CSS processing with Tailwind CSS
- **TypeScript Configuration**: Strict type checking
- **Package Management**: npm/yarn compatibility

### 🛡️ Security Features
- **CORS Configuration**: Proper cross-origin request handling
- **Input Validation**: Server-side request validation
- **Error Sanitization**: Safe error message handling
- **Connection Security**: Secure database credential storage

## 🚀 What You Can Do

Once both servers are running, you can:
- **Create database connections** to your MySQL, PostgreSQL, SQL Server, SQLite, or MongoDB databases
- **Browse database schemas** with an interactive tree view for all supported database types
- **Write and execute SQL queries** with syntax highlighting (NoSQL support planned)
- **View query results** in a professional data table with export capabilities
- **Export results** to CSV or copy to clipboard
- **Manage multiple query tabs** for different tasks and databases
- **Switch between database connections** seamlessly across different database systems
- **View database relationships** in an interactive ERD diagram for relational databases
- **Test connections** before saving with database-specific validation
- **Manage connection settings** through dedicated settings modal

## 🔮 Current Status

This application is a fully functional MVP (Minimum Viable Product) with all core features implemented and working. Users can:

- Connect to multiple database systems (MySQL, PostgreSQL, Microsoft SQL Server, SQLite, with MongoDB planned)
- Browse database schemas interactively across all supported database types
- Write and execute SQL queries with professional syntax highlighting
- View and export query results with comprehensive formatting options
- Manage multiple query tabs for enhanced productivity
- Switch between different database connections with seamless transitions
- Test database connections before saving with validation feedback
- Configure advanced connection settings through dedicated interface

The application provides a professional database management experience suitable for developers, analysts, database administrators, and anyone working with multiple database systems.

## 📅 Updates: July 9-10, 2025

### 🔄 Multi-Database Support
- **PostgreSQL Support**: Added full support for PostgreSQL databases alongside MySQL
- **Database Type Selection**: Connection modal now allows selecting between MySQL and PostgreSQL
- **Dynamic Port Assignment**: Default port changes automatically based on selected database type
- **Unified Schema Interface**: Schema browser now works consistently with both database systems
- **Connector Abstraction**: Created a unified database connector system for all supported databases

### 🛠️ Backend Enhancements
- **PostgreSQL Connector**: Implemented PostgreSQLConnector class using psycopg2
- **Connector Factory Pattern**: Added dynamic connector creation based on database type
- **Model Updates**: Added database_type field to Connection model
- **Schema Mapping**: Updated backend to handle both snake_case and camelCase field naming
- **Schema Normalization**: Unified table and column access across different database systems

### 🧩 Frontend Improvements
- **Database Type UI**: Added database type dropdown to connection modal
- **Enhanced Schema Browser**: Fixed React key warnings and normalized table name access
- **Type Handling**: Improved handling of database type field across components
- **Error Handling**: Added more robust error handling for different database systems
- **Debug Logging**: Added comprehensive logging for troubleshooting database connections

### 📦 Dependencies
- Added psycopg2-binary to requirements.txt for PostgreSQL support

## 📅 Updates: July 11, 2025

### 🔥 Major Database Expansion
- **Microsoft SQL Server Support**: Full integration with MSSQL databases using pyodbc
- **SQLite Support**: Added complete SQLite database connectivity for file-based databases
- **MongoDB Foundation**: Implemented MongoDB connector framework (backend ready, UI pending)
- **Universal Database Support**: Now supports 5 different database systems in one platform

### 🔧 MSSQL Integration Features
- **Multi-Driver Support**: Automatic detection and fallback for ODBC drivers:
  - ODBC Driver 18 for SQL Server (latest)
  - ODBC Driver 17 for SQL Server (recommended)
  - ODBC Driver 13 for SQL Server
  - SQL Server Native Client versions
  - Generic SQL Server driver fallback
- **Named Instance Support**: Full support for SQL Server named instances (e.g., `DESKTOP-NAME\SQLEXPRESS`)
- **Connection String Optimization**: Intelligent connection string construction based on instance type
- **Retry Logic**: Built-in connection retry mechanism with multiple driver attempts
- **Schema Introspection**: Complete schema browsing with:
  - Table and column information
  - Primary key detection
  - Foreign key relationships using `sys.foreign_key_columns`
  - Data type mapping and categorization
  - Row count and sample data retrieval

### 📂 SQLite Integration Features
- **File-Based Database Support**: Connect to any SQLite database file
- **Auto-Creation**: Automatic database file creation for new connections
- **PRAGMA Support**: Full SQLite PRAGMA command support for schema introspection
- **Performance Optimized**: Efficient handling of SQLite-specific features
- **Cross-Platform**: Works on Windows, macOS, and Linux

### 🗄️ MongoDB Foundation (Backend Complete)
- **pymongo Integration**: Full MongoDB Python driver integration
- **Connection Framework**: Complete MongoDB connector architecture
- **Document Database Support**: Foundation for NoSQL document operations
- **Collection Management**: Backend support for MongoDB collections and documents
- **Connection String Support**: Standard MongoDB connection string parsing

### 🎯 Connection Management Enhancements
- **Database Type Expansion**: Connection modal now supports 5 database types:
  - MySQL (default port: 3306)
  - PostgreSQL (default port: 5432)
  - Microsoft SQL Server (default port: 1433)
  - SQLite (file path selection)
  - MongoDB (default port: 27017)
- **Dynamic UI Forms**: Connection form adapts based on selected database type
- **Port Auto-Configuration**: Automatic default port assignment per database type
- **Enhanced Validation**: Database-specific connection validation and testing
- **Connection Settings Modal**: Dedicated interface for managing connection configurations

### 🏗️ Backend Architecture Improvements
- **Abstract Connector Pattern**: Unified `DatabaseConnector` abstract base class
- **Factory Pattern Implementation**: `create_connector()` factory for dynamic connector creation
- **Error Handling Enhancement**: Comprehensive error handling with database-specific messages
- **Connection Pooling**: Improved connection management across database types
- **Schema Normalization**: Unified schema format across all database systems
- **Type Safety**: Enhanced type hints and validation throughout connector classes

### 🔍 Advanced SQL Server Features
- **System Table Queries**: Direct `sys.foreign_key_columns` integration for relationship mapping
- **OBJECT_NAME/COL_NAME Functions**: Efficient SQL Server system function utilization
- **Connection Diagnostics**: Built-in connection testing and driver verification
- **Performance Optimization**: Query optimization for large SQL Server databases
- **Security Enhancements**: Secure credential handling and Trusted_Connection management

### 🛠️ Development and Testing Tools
- **Comprehensive Test Scripts**: Created multiple testing utilities:
  - `test_mssql_schema.py`: SQL Server connection and schema testing
  - `test_connector.py`: Direct connector testing framework
  - `sql_server_diagnostics.py`: Advanced SQL Server diagnostics
- **Connection Verification**: Real-time connection status and validation
- **Debug Logging**: Enhanced logging for troubleshooting database connections
- **Error Analysis**: Detailed error reporting for connection issues

### 📋 Technical Improvements
- **Dependency Management**: Added new database drivers to requirements.txt:
  - `pyodbc` for SQL Server connectivity
  - `pymongo` for MongoDB support
- **Code Organization**: Improved code structure with better separation of concerns
- **Documentation**: Enhanced inline documentation and error messages
- **Exception Handling**: Database-specific exception handling and user feedback
- **Performance Monitoring**: Added execution time tracking for schema operations

### 🔧 Configuration Enhancements
- **Multi-Driver Detection**: Automatic ODBC driver enumeration on system startup
- **Fallback Mechanisms**: Graceful degradation when preferred drivers aren't available
- **Connection String Building**: Dynamic connection string construction per database type
- **Timeout Management**: Configurable connection timeouts for different database systems
- **Credential Security**: Enhanced security for database credential storage and transmission