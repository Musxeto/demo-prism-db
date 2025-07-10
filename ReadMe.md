# Database Query Studio

A modern, full-stack database management platform built with React, FastAPI, and support for multiple database systems (MySQL and PostgreSQL). This application provides a comprehensive interface for managing database connections, browsing schemas, executing queries, and analyzing results.

## 🚀 Quick Start Guide

### Prerequisites
Before running this application, make sure you have:
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download here](https://python.org/)
- **MySQL Server** - [Download here](https://dev.mysql.com/downloads/mysql/)
- **PostgreSQL** (optional) - [Download here](https://www.postgresql.org/download/)

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
- **Dependencies issues**: Delete `node_modules` and run `npm install` again for frontend, or recreate virtual environment for Python
- **CORS issues**: The backend is configured to allow localhost:5173 - make sure both servers are running

## 🚀 Features Completed

### 🔗 Connection Management
- **Multiple Database Connections**: Support for managing multiple database connections (MySQL and PostgreSQL)
- **Database Type Selection**: Choose between MySQL and PostgreSQL when creating connections
- **Connection Creation Modal**: User-friendly interface for adding new database connections
- **Connection Testing**: Built-in connection validation before saving
- **Active Connection Switching**: Seamless switching between different database connections
- **Connection Persistence**: All connections are stored in SQLite database for persistence

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
  - MySQL Connector: Native MySQL database connectivity
  - psycopg2: PostgreSQL database connectivity
- **CORS Support**: Cross-origin resource sharing configuration
- **API Endpoints**:
  - `GET /api/connections` - List all connections
  - `POST /api/connections` - Create new connection
  - `GET /api/connections/{id}/schema` - Get database schema
  - `POST /api/connections/{id}/query` - Execute SQL queries
  - `POST /api/connections/test-and-load` - Test connection and load schema

#### Database
- **SQLite**: Local storage for application data (connections, queries)
- **Target Databases**:
  - **MySQL**: Primary database system for query execution
  - **PostgreSQL**: Secondary database system with full support
- **Drizzle ORM**: Type-safe database schema definitions
- **Database Abstraction**: Connector pattern for unified database access

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
- **Create database connections** to your MySQL or PostgreSQL databases
- **Browse database schemas** with an interactive tree view
- **Write and execute SQL queries** with syntax highlighting
- **View query results** in a professional data table
- **Export results** to CSV or copy to clipboard
- **Manage multiple query tabs** for different tasks
- **Switch between database connections** seamlessly
- **View database relationships** in an interactive ERD diagram

## 🔮 Current Status

This application is a fully functional MVP (Minimum Viable Product) with all core features implemented and working. Users can:

- Connect to multiple database systems (MySQL and PostgreSQL)
- Browse database schemas interactively
- Write and execute SQL queries
- View and export query results
- Manage multiple query tabs
- Switch between different database connections

The application provides a professional database management experience suitable for developers, analysts, and database administrators.

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