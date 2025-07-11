# SQL Server Quick Reference for Database Studio

## 🔍 Essential SQL Server Queries

### System Information
```sql
-- SQL Server version and edition
SELECT @@VERSION;
SELECT SERVERPROPERTY('ProductVersion') AS Version,
       SERVERPROPERTY('Edition') AS Edition;

-- Current database and user
SELECT DB_NAME() AS CurrentDatabase, USER_NAME() AS CurrentUser;

-- Server information
SELECT SERVERPROPERTY('MachineName') AS ServerName,
       SERVERPROPERTY('InstanceName') AS InstanceName;
```

### Database Schema Exploration
```sql
-- List all databases
SELECT name FROM sys.databases;

-- List all tables in current database
SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
ORDER BY TABLE_SCHEMA, TABLE_NAME;

-- Get table column details
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'YourTableName'
ORDER BY ORDINAL_POSITION;

-- List primary keys
SELECT 
    tc.TABLE_NAME,
    kcu.COLUMN_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
    ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY';

-- List foreign keys
SELECT 
    fk.TABLE_NAME AS ForeignKeyTable,
    fk.COLUMN_NAME AS ForeignKeyColumn,
    pk.TABLE_NAME AS PrimaryKeyTable,
    pk.COLUMN_NAME AS PrimaryKeyColumn
FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE fk 
    ON rc.CONSTRAINT_NAME = fk.CONSTRAINT_NAME
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pk 
    ON rc.UNIQUE_CONSTRAINT_NAME = pk.CONSTRAINT_NAME;
```

### Data Querying with SQL Server Syntax
```sql
-- Top N rows (SQL Server specific)
SELECT TOP 10 * FROM Customers ORDER BY CustomerID;

-- Pagination with OFFSET/FETCH (SQL Server 2012+)
SELECT * FROM Customers 
ORDER BY CustomerID 
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;

-- String functions
SELECT 
    LEN('Hello World') AS Length,           -- Length of string
    CHARINDEX('o', 'Hello World') AS Position, -- Find substring position
    SUBSTRING('Hello World', 1, 5) AS SubStr,  -- Extract substring
    REPLACE('Hello World', 'World', 'SQL') AS Replaced;

-- Date functions
SELECT 
    GETDATE() AS CurrentDateTime,
    DATEPART(YEAR, GETDATE()) AS CurrentYear,
    DATEADD(DAY, 30, GETDATE()) AS ThirtyDaysFromNow,
    DATEDIFF(DAY, '2024-01-01', GETDATE()) AS DaysSinceNewYear;

-- Conditional logic
SELECT 
    ProductName,
    UnitPrice,
    CASE 
        WHEN UnitPrice < 10 THEN 'Cheap'
        WHEN UnitPrice < 50 THEN 'Moderate'
        ELSE 'Expensive'
    END AS PriceCategory
FROM Products;
```

### Table Operations
```sql
-- Create table
CREATE TABLE Employees (
    ID int IDENTITY(1,1) PRIMARY KEY,    -- Auto-increment primary key
    FirstName nvarchar(50) NOT NULL,
    LastName nvarchar(50) NOT NULL,
    Email nvarchar(100) UNIQUE,
    HireDate datetime DEFAULT GETDATE(),
    Salary money
);

-- Insert data
INSERT INTO Employees (FirstName, LastName, Email, Salary)
VALUES ('John', 'Doe', 'john.doe@company.com', 50000);

-- Update with joins
UPDATE e
SET e.Salary = e.Salary * 1.1
FROM Employees e
JOIN Departments d ON e.DepartmentID = d.ID
WHERE d.Name = 'IT';

-- Delete with conditions
DELETE FROM Employees 
WHERE HireDate < DATEADD(YEAR, -5, GETDATE());
```

### Indexes and Performance
```sql
-- List all indexes
SELECT 
    i.name AS IndexName,
    t.name AS TableName,
    i.type_desc AS IndexType
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.index_id > 0;

-- Create index
CREATE INDEX IX_Employee_LastName ON Employees(LastName);

-- Execution plan (add before your query)
SET SHOWPLAN_ALL ON;
-- Your query here
SET SHOWPLAN_ALL OFF;
```

### SQL Server Specific Features
```sql
-- Common Table Expressions (CTE)
WITH EmployeeCTE AS (
    SELECT FirstName, LastName, Salary,
           ROW_NUMBER() OVER (ORDER BY Salary DESC) as Rank
    FROM Employees
)
SELECT * FROM EmployeeCTE WHERE Rank <= 5;

-- Window functions
SELECT 
    FirstName,
    LastName,
    Salary,
    AVG(Salary) OVER() AS AvgSalary,
    RANK() OVER(ORDER BY Salary DESC) AS SalaryRank
FROM Employees;

-- MERGE statement (Upsert)
MERGE Employees AS target
USING (VALUES (1, 'Updated', 'Name', 60000)) AS source (ID, FirstName, LastName, Salary)
ON target.ID = source.ID
WHEN MATCHED THEN 
    UPDATE SET FirstName = source.FirstName, Salary = source.Salary
WHEN NOT MATCHED THEN
    INSERT (FirstName, LastName, Salary) 
    VALUES (source.FirstName, source.LastName, source.Salary);
```

## 🎯 SQL Server vs Standard SQL Differences

### Key Differences to Remember
| Feature | SQL Server | MySQL | PostgreSQL |
|---------|------------|-------|------------|
| **Limit** | `TOP N` or `OFFSET/FETCH` | `LIMIT N` | `LIMIT N` |
| **Auto Increment** | `IDENTITY(1,1)` | `AUTO_INCREMENT` | `SERIAL` |
| **String Concat** | `+` or `CONCAT()` | `CONCAT()` | `\|\|` or `CONCAT()` |
| **Date/Time** | `GETDATE()` | `NOW()` | `NOW()` |
| **String Length** | `LEN()` | `LENGTH()` | `LENGTH()` |
| **Substring** | `SUBSTRING(str, start, len)` | `SUBSTRING(str, start, len)` | `SUBSTRING(str, start, len)` |

### Data Types
| SQL Server | MySQL Equivalent | PostgreSQL Equivalent |
|------------|------------------|----------------------|
| `nvarchar(n)` | `varchar(n)` | `varchar(n)` |
| `int` | `int` | `integer` |
| `bigint` | `bigint` | `bigint` |
| `money` | `decimal(19,4)` | `money` |
| `datetime` | `datetime` | `timestamp` |
| `bit` | `boolean` | `boolean` |
| `uniqueidentifier` | `char(36)` | `uuid` |

## 🔧 Common Troubleshooting Queries

### Performance Analysis
```sql
-- Find slow queries
SELECT TOP 10
    total_elapsed_time/execution_count AS avg_elapsed_time,
    execution_count,
    SUBSTRING(st.text, (qs.statement_start_offset/2)+1,
        ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(st.text)
            ELSE qs.statement_end_offset
        END - qs.statement_start_offset)/2) + 1) AS statement_text
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
ORDER BY avg_elapsed_time DESC;

-- Table sizes
SELECT 
    t.NAME AS TableName,
    i.name as IndexName,
    p.rows AS RowCounts,
    SUM(a.total_pages) * 8 AS TotalSpaceKB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.OBJECT_ID = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
GROUP BY t.Name, i.name, p.Rows
ORDER BY TotalSpaceKB DESC;
```

### Database Maintenance
```sql
-- Check database size
SELECT 
    DB_NAME() AS DatabaseName,
    (SELECT SUM(size * 8.0 / 1024) FROM sys.database_files WHERE type = 0) AS DataSizeMB,
    (SELECT SUM(size * 8.0 / 1024) FROM sys.database_files WHERE type = 1) AS LogSizeMB;

-- Rebuild indexes
ALTER INDEX ALL ON YourTableName REBUILD;

-- Update statistics
UPDATE STATISTICS YourTableName;
```

## 💡 Pro Tips

1. **Use SSMS or Azure Data Studio** for advanced development alongside this web interface
2. **Always test on sample data** before running updates/deletes on production
3. **Use transactions** for multi-statement operations:
   ```sql
   BEGIN TRANSACTION;
   -- Your statements here
   COMMIT; -- or ROLLBACK;
   ```
4. **Schema prefixes**: Use `dbo.TableName` to be explicit about schema
5. **Parameterized queries**: Always use parameters for user input in production code
