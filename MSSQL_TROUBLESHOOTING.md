# MSSQL Connection Troubleshooting Guide

This guide provides detailed troubleshooting steps for common Microsoft SQL Server connection issues.

## Common Error Messages and Solutions

### Error: "SQL Server does not exist or access denied"

This typically happens when the application cannot reach the SQL Server instance.

**Solutions:**

1. **Check Server Name Format**
   - For default instance: `servername` or `servername,1433`
   - For named instance: `servername\instancename`
   - For SQL Express: `servername\SQLEXPRESS`
   - Try using IP address instead of hostname: `192.168.x.x`

2. **Verify SQL Server is Running**
   - Check SQL Server service is running in Windows Services
   - Ensure SQL Server Browser service is running (required for named instances)

3. **Firewall Configuration**
   - Ensure port 1433 (default) is open on the server firewall
   - For named instances, ensure UDP port 1434 is open for SQL Browser service
   - Test with `telnet servername 1433` from client machine

4. **Network Configuration**
   - Verify SQL Server is configured to allow TCP/IP connections
   - SQL Server Configuration Manager → SQL Server Network Configuration → Protocols → Enable TCP/IP

### Error: "Login failed for user"

This happens when authentication fails.

**Solutions:**

1. **Authentication Mode**
   - Ensure SQL Server is configured for "SQL Server and Windows Authentication mode"
   - Right-click server in SSMS → Properties → Security → Server Authentication

2. **User Permissions**
   - Verify user exists in SQL Server
   - Ensure user has login rights to the server
   - Check if user has access to the specific database

3. **Password Issues**
   - Verify password is correct (no typos)
   - Check if password contains special characters that need escaping

### Error: "Cannot open database requested by the login"

This means the user doesn't have permission to the specific database.

**Solutions:**

1. **Database Permissions**
   - Verify user has been granted access to the database
   - In SSMS: Security → Logins → [user] → User Mapping → Check the database

2. **Database State**
   - Verify database is online and not in single-user mode

## ODBC Driver Troubleshooting

### Missing or Incompatible Driver

If you see errors related to ODBC drivers:

1. **Install Official Microsoft ODBC Driver**
   - Download from: [Microsoft SQL Server ODBC Drivers](https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)
   - Available for Windows, Linux and macOS

2. **Check Driver Version**
   - The application tries multiple drivers in sequence
   - For best results, install the latest ODBC Driver (18+)

3. **Driver Configuration**
   - On Windows: Check ODBC Data Source Administrator
   - Verify driver is properly registered

## Connection String Format Reference

```
// Basic format
SERVER=hostname,port;DATABASE=dbname;UID=username;PWD=password;

// Named instance
SERVER=hostname\instancename;DATABASE=dbname;UID=username;PWD=password;

// With trusted certificate option
SERVER=hostname;DATABASE=dbname;UID=username;PWD=password;TrustServerCertificate=Yes;

// With connection timeout
SERVER=hostname;DATABASE=dbname;UID=username;PWD=password;Connection Timeout=30;
```

## Testing Tools

1. **SQL Server Management Studio (SSMS)**
   - Use SSMS to test connection with the same credentials
   - Isolate whether issue is with credentials or network

2. **Command Line Tools**
   - Test network connectivity: `ping servername`
   - Test TCP port: `telnet servername 1433`
   - Test with SQLCMD utility: `sqlcmd -S servername -U username -P password`

3. **ODBC Data Source Administrator**
   - Test DSN connection using the same driver
