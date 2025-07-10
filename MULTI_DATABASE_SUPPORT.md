# Multi-Database Connectivity Support

This feature allows users to connect to multiple types of databases, explore their schemas visually, and run SQL queries via an interactive editor.

## Supported Database Types

- MySQL (using mysql-connector-python)
- PostgreSQL (using psycopg2)
- Microsoft SQL Server (using pyodbc with automatic driver detection)
- SQLite (using SQLAlchemy)
- MongoDB (coming soon, will use pymongo)

## Features

### Database Connection

- Connect to external databases dynamically
- Test connections before saving
- Store and manage multiple connection profiles
- Secure credential storage
- Automatic selection of appropriate database driver based on database type

### Schema Explorer

- Browse database schemas, tables, and columns
- View data types, constraints, and relationships
- Interactive tree view for navigation
- Primary/foreign key visualization

### SQL Query Editor

- Write and execute SQL queries
- Syntax highlighting
- Multiple query tabs
- Query history tracking
- Dangerous query detection and confirmation

### Query Results

- Tabular view of query results
- Client-side and server-side pagination
- Support for various result types (SELECT, INSERT, UPDATE, etc.)
- Execution time metrics

## Setting Up Database Connections

1. Click "New Connection" in the UI
2. Select your database type
3. Enter connection details:
   - Host
   - Port
   - Database name
   - Username
   - Password
4. Click "Test Connection" to validate
5. Save your connection

## SQL Server ODBC Setup

To connect to Microsoft SQL Server databases, this application uses ODBC:

1. Install the Microsoft ODBC Driver for SQL Server on your server. You can download it from:
   https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server

2. For Windows:
   - The driver will be automatically registered after installation
   - The application will automatically attempt to use available drivers in this order:
     1. "ODBC Driver 18 for SQL Server" (latest)
     2. "ODBC Driver 17 for SQL Server"
     3. "ODBC Driver 13 for SQL Server"
     4. "SQL Server Native Client 11.0"
     5. "SQL Server Native Client 10.0"
     6. "SQL Server" (generic)
   - No manual driver configuration is needed

3. For Linux:
   - Follow the installation instructions for your specific distribution
   - The application will automatically try to use the installed driver
   - Ensure the driver is properly registered in your odbcinst.ini file

4. For macOS:
   - Install using homebrew: `brew install microsoft/mssql-release/msodbcsql17`
   - Or download the package installer from Microsoft's website

## Implementation Architecture

### Database Connector System

The system uses a factory pattern to dynamically select the appropriate connector:

1. User selects database type from the UI
2. Backend creates the appropriate connector via the `create_connector()` factory function
3. Each database type has its own connector class implementing the `DatabaseConnector` interface
4. No configuration of specific database drivers is required from the user

### Connection String Handling

Each database connector handles its own connection string format internally:

- **MySQL**: Uses mysql-connector-python's dictionary connection format
- **SQLite**: Uses SQLAlchemy with sqlite3
- **PostgreSQL**: Will use psycopg2 connection parameters
- **MS SQL Server**: Uses pyodbc with dynamic ODBC driver detection
- **MongoDB**: Will use pymongo's connection string URI format

## Security Considerations

- Passwords are stored securely with encryption
- Dangerous SQL operations require confirmation
- No sensitive information is exposed in logs or UI

## Requirements

The feature requires the following Python packages:

```
fastapi
uvicorn[standard]
pydantic
python-dotenv
sqlalchemy

# Database Drivers
mysql-connector-python>=8.0.0    # MySQL driver
psycopg2-binary>=2.9.0          # PostgreSQL driver
pyodbc>=4.0.35                  # ODBC driver (for MS SQL Server)
pymongo>=4.0.0                  # MongoDB driver
SQLAlchemy>=2.0.0               # ORM for SQLite, PostgreSQL, etc.

# Utility packages
cryptography>=3.4.0            # For secure storage of passwords
```

Install these packages using:

```
pip install -r requirements.txt
```

## Architecture

The multi-database support is implemented using a connector system:

1. `DatabaseConnector` - Abstract base class defining the interface
2. Specific implementations for each database type:
   - `MySQLConnector` - Using mysql-connector-python
   - `PostgreSQLConnector` - Using psycopg2-binary
   - `MSSQLConnector` - Using pyodbc with automatic ODBC driver detection
   - `SQLiteConnector` - Using built-in sqlite3
3. `create_connector()` factory function that:
   - Takes a configuration dictionary with database_type
   - Creates and returns the appropriate connector instance

## SQL Server Named Instances

For SQL Server named instances (e.g., `SERVERNAME\INSTANCENAME`):

1. Enter the full instance name in the "Host" field (e.g., `DESKTOP-1VHT16K\SQLEXPRESS`)
2. The application will handle the connection string properly for named instances
3. No need to specify a port for named instances (the default SQL Browser service will be used)
4. The connection string will be automatically formatted correctly:
   ```
   DRIVER={ODBC Driver 17 for SQL Server};SERVER=DESKTOP-1VHT16K\SQLEXPRESS;DATABASE=mydatabase;UID=username;PWD=password;Trusted_Connection=no;
   ```

### Troubleshooting SQL Server Connections

If you encounter connection issues:

1. Make sure the SQL Server instance is running and accessible
2. Verify that TCP/IP protocol is enabled in SQL Server Configuration Manager
3. For named instances, ensure the SQL Browser service is running
4. Verify your credentials have appropriate permissions
5. Check the server logs for detailed error messages
   - `MongoDBConnector` - Using pymongo

A factory function creates the appropriate connector based on the database type in the connection configuration.

## Future Enhancements

- Visual ER Diagram generator
- Drag-and-drop query builder
- AI-based SQL suggestion system
- Query execution plan viewer
