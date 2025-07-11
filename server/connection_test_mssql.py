import pyodbc

database = 'wrestlers'
server =  r'DESKTOP-1VHT16K\SQLEXPRESS'
username = 'sa'
password = 'admin123'

connection_string = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=DESKTOP-1VHT16K\\SQLEXPRESS;"
    "DATABASE=wrestlers;"
    "UID=sa;"
    "PWD=admin123;"
)

try:
    conn = pyodbc.connect(connection_string)
    print("✅ Connection successful!")
    cursor = conn.cursor()
    cursor.execute("SELECT @@VERSION;")
    row = cursor.fetchone()
    print("SQL Server Version:", row[0])

    conn.close()

except pyodbc.Error as e:
    print("❌ Error while connecting to SQL Server:", e)
