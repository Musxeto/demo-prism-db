# Microsoft SQL Server (MSSQL) Support Implementation

## ✅ Implementation Status

Microsoft SQL Server support has been successfully added to the multi-database connection system with the following features:

### 🔧 Backend Implementation
- ✅ **MSSQLConnector Class**: Complete ODBC-based connector with multiple driver support
- ✅ **Multiple Driver Support**: Automatically tries multiple ODBC drivers in priority order
- ✅ **Enhanced Error Handling**: Detailed error messages with driver availability information
- ✅ **Schema Introspection**: Full table, column, primary key, and foreign key detection
- ✅ **Query Execution**: Support for SELECT and DML operations with proper result formatting
- ✅ **Connection Testing**: Robust connection validation with helpful error messages

### 🌐 Frontend Integration
- ✅ **Database Type Dropdown**: MSSQL added to connection modal
- ✅ **Port Configuration**: Automatic port setting to 1433 for MSSQL
- ✅ **User Guidance**: ODBC driver installation hint for MSSQL connections

### 📦 Dependencies
- ✅ **pyodbc**: Already included in requirements.txt
- ✅ **ODBC Drivers**: Support for multiple driver versions (17+, 13, 11, etc.)

## 🚀 Usage

### Connection Configuration
When creating a new connection, select "Microsoft SQL Server" from the database type dropdown:

```json
{
  "name": "My SQL Server",
  "host": "DESKTOP-1VHT16K\\SQLEXPRESS",  // Named instance
  "port": 1433,                          // Standard MSSQL port
  "database": "wrestlers",
  "username": "sa",
  "password": "admin123",
  "databaseType": "mssql"
}
```

### Supported Connection Formats

#### Named Instance (Recommended)
```
Host: SERVER\\INSTANCE_NAME
Port: 1433 (ignored for named instances)
```

#### Default Instance
```
Host: server.domain.com
Port: 1433
```

#### IP Address
```
Host: 192.168.1.100
Port: 1433
```

## 🔍 Supported ODBC Drivers

The system automatically detects and tries the following drivers in order:

1. **ODBC Driver 18 for SQL Server** (Latest, 2022+)
2. **ODBC Driver 17 for SQL Server** (Common, 2016+)
3. **ODBC Driver 13 for SQL Server** (Older, 2014+)
4. **ODBC Driver 11 for SQL Server** (Legacy)
5. **SQL Server Native Client 11.0** (Older)
6. **SQL Server Native Client 10.0** (Even older)
7. **SQL Server** (Generic fallback)

## 📋 Features

### Schema Browsing
- ✅ Table listing with row counts
- ✅ Column information with data types
- ✅ Primary key detection
- ✅ Foreign key relationships
- ✅ Sample data preview

### Query Execution
- ✅ SELECT queries with result formatting
- ✅ INSERT, UPDATE, DELETE with affected row counts
- ✅ Execution time tracking
- ✅ Comprehensive error handling

### SQL Server Specific Features
- ✅ **Named Instance Support**: Handles `SERVER\\INSTANCE` format
- ✅ **Type Mapping**: Converts SQL Server types to readable formats
- ✅ **Connection String Optimization**: Automatically handles port for named instances

## 🧪 Testing

### Test Files Created
1. **`test_mssql_enhanced.py`**: Comprehensive connector testing
2. **`test_mssql_api.py`**: API endpoint integration testing
3. **`connection_test_mssql.py`**: Basic pyodbc connection validation

### Sample Test Queries

#### System Information
```sql
SELECT @@VERSION AS ServerVersion;
SELECT SERVERPROPERTY('ProductVersion') AS Version;
SELECT DB_NAME() AS CurrentDatabase;
```

#### Schema Exploration
```sql
-- List all tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE';

-- Get table column info
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'YourTable';

-- List indexes
SELECT i.name AS IndexName, t.name AS TableName
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.index_id > 0;
```

#### Performance Queries
```sql
-- Top 10 largest tables
SELECT TOP 10
    t.NAME AS TableName,
    p.rows AS RowCounts,
    SUM(a.total_pages) * 8 AS TotalSpaceKB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.OBJECT_ID = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
GROUP BY t.Name, p.Rows
ORDER BY TotalSpaceKB DESC;
```

## 🔧 Installation Requirements

### ODBC Driver Installation
Users need to install Microsoft ODBC Driver for SQL Server:

#### Windows
1. Download from [Microsoft ODBC Driver 17 for SQL Server](https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)
2. Run the installer
3. Verify installation: `Control Panel > Administrative Tools > ODBC Data Sources`

#### Linux
```bash
# Ubuntu/Debian
curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
curl https://packages.microsoft.com/config/ubuntu/20.04/prod.list > /etc/apt/sources.list.d/mssql-release.list
apt-get update
ACCEPT_EULA=Y apt-get install msodbcsql17
```

#### macOS
```bash
# Using Homebrew
brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
brew update
HOMEBREW_NO_ENV_FILTERING=1 ACCEPT_EULA=Y brew install msodbcsql17 mssql-tools
```

## 🛠️ Troubleshooting

### Common Issues

#### "No SQL Server ODBC drivers found"
- **Solution**: Install ODBC Driver 17+ for SQL Server
- **Check**: Run `pyodbc.drivers()` to see available drivers

#### Named Instance Connection Issues
- **Solution**: Use format `SERVER\\INSTANCE` (double backslash)
- **Note**: Port is ignored for named instances

#### Authentication Failures
- **SQL Authentication**: Ensure SQL Server authentication is enabled
- **Windows Authentication**: Use trusted connection (not implemented yet)

#### Connection Timeout
- **Solution**: Check firewall settings, SQL Server is running
- **Check**: Verify SQL Server Browser service is running for named instances

### Error Messages

#### "Login failed for user"
- Check username/password
- Verify user has access to specified database
- Ensure SQL Server authentication is enabled

#### "Cannot open database"
- Database name might be incorrect
- User doesn't have access to the database
- Database might be offline

## 🎯 Future Enhancements

### Planned Features
- [ ] **Windows Authentication**: Support for trusted connections
- [ ] **Azure SQL Database**: Support for Azure-hosted databases
- [ ] **Connection Pooling**: Optimize connection management
- [ ] **Bulk Operations**: Support for bulk inserts/updates
- [ ] **Stored Procedures**: Execute stored procedures with parameters
- [ ] **Transaction Support**: BEGIN/COMMIT/ROLLBACK transaction management

### Advanced Configuration
- [ ] **Connection String Customization**: Allow custom connection string parameters
- [ ] **SSL/TLS Configuration**: Support for encrypted connections
- [ ] **Connection Timeout**: Configurable timeout settings
- [ ] **Query Timeout**: Per-query timeout configuration

## 📊 Performance Considerations

### Best Practices
1. **Use Named Instances**: More reliable than port-based connections
2. **Connection Pooling**: Reuse connections when possible
3. **Query Optimization**: Use appropriate indexes and WHERE clauses
4. **Limit Result Sets**: Use TOP/LIMIT for large datasets

### Monitoring
- Query execution times are tracked and reported
- Connection attempts are logged with driver information
- Schema retrieval performance is optimized with targeted queries

## 🔒 Security Notes

### Recommendations
- Use strong passwords for SQL authentication
- Consider Windows Authentication where possible
- Encrypt connections in production environments
- Limit database user permissions to necessary operations only
- Regularly update ODBC drivers for security patches

### Configuration Security
- Connection passwords are stored securely
- Connection strings are built dynamically to prevent injection
- Timeout settings prevent hanging connections
