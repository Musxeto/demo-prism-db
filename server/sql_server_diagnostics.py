#!/usr/bin/env python3
"""
SQL Server Connection Diagnostics
Helps troubleshoot MSSQL connection issues with detailed testing
"""

import sys
import os

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    import pyodbc
    print("✅ pyodbc is available")
except ImportError:
    print("❌ pyodbc is not installed. Please install it with: pip install pyodbc")
    sys.exit(1)

def test_odbc_drivers():
    """List all available ODBC drivers"""
    print("\n🔍 Available ODBC Drivers:")
    print("-" * 40)
    
    drivers = pyodbc.drivers()
    sql_server_drivers = []
    
    for driver in drivers:
        if 'sql server' in driver.lower():
            sql_server_drivers.append(driver)
            print(f"✅ {driver}")
        else:
            print(f"   {driver}")
    
    print(f"\n📊 Found {len(sql_server_drivers)} SQL Server drivers:")
    for driver in sql_server_drivers:
        print(f"   • {driver}")
    
    return sql_server_drivers

def test_connection_variations():
    """Test different connection string variations"""
    
    # Base configuration
    base_config = {
        'host': r'DESKTOP-1VHT16K\SQLEXPRESS',
        'database': 'wrestlers',
        'username': 'sa',
        'password': 'admin123'
    }
    
    # Get available drivers
    drivers = [d for d in pyodbc.drivers() if 'sql server' in d.lower()]
    if not drivers:
        print("❌ No SQL Server drivers found!")
        return
    
    # Use the best available driver
    driver = "ODBC Driver 17 for SQL Server" if "ODBC Driver 17 for SQL Server" in drivers else drivers[0]
    print(f"\n🧪 Testing with driver: {driver}")
    
    # Test variations
    variations = [
        {
            "name": "Named Instance (Trusted_Connection=no)",
            "connection_string": (
                f"DRIVER={{{driver}}};"
                f"SERVER={base_config['host']};"
                f"DATABASE={base_config['database']};"
                f"UID={base_config['username']};"
                f"PWD={base_config['password']};"
                "Trusted_Connection=no;"
            )
        },
        {
            "name": "Named Instance (No Trusted_Connection)",
            "connection_string": (
                f"DRIVER={{{driver}}};"
                f"SERVER={base_config['host']};"
                f"DATABASE={base_config['database']};"
                f"UID={base_config['username']};"
                f"PWD={base_config['password']};"
            )
        },
        {
            "name": "Named Instance (Network Protocol)",
            "connection_string": (
                f"DRIVER={{{driver}}};"
                f"SERVER=tcp:{base_config['host']};"
                f"DATABASE={base_config['database']};"
                f"UID={base_config['username']};"
                f"PWD={base_config['password']};"
                "Trusted_Connection=no;"
            )
        },
        {
            "name": "Default Instance Format",
            "connection_string": (
                f"DRIVER={{{driver}}};"
                f"SERVER=DESKTOP-1VHT16K,1433;"
                f"DATABASE={base_config['database']};"
                f"UID={base_config['username']};"
                f"PWD={base_config['password']};"
                "Trusted_Connection=no;"
            )
        },
        {
            "name": "Local Named Pipe",
            "connection_string": (
                f"DRIVER={{{driver}}};"
                f"SERVER=np:{base_config['host']};"
                f"DATABASE={base_config['database']};"
                f"UID={base_config['username']};"
                f"PWD={base_config['password']};"
                "Trusted_Connection=no;"
            )
        }
    ]
    
    print("\n🔄 Testing Connection Variations:")
    print("=" * 60)
    
    for i, variation in enumerate(variations, 1):
        print(f"\n{i}. {variation['name']}")
        print(f"   Connection String: {variation['connection_string']}")
        
        try:
            conn = pyodbc.connect(variation['connection_string'], timeout=5)
            cursor = conn.cursor()
            cursor.execute("SELECT @@SERVERNAME AS ServerName, @@VERSION AS Version")
            row = cursor.fetchone()
            
            print(f"   ✅ SUCCESS!")
            print(f"   Server: {row[0]}")
            print(f"   Version: {row[1][:60]}...")
            
            cursor.close()
            conn.close()
            
            # If this works, suggest this as the solution
            print(f"\n🎉 SOLUTION FOUND! Use this connection string format.")
            return variation
            
        except pyodbc.Error as e:
            print(f"   ❌ FAILED: {e}")
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
    
    return None

def check_sql_server_services():
    """Check if SQL Server services are running (Windows only)"""
    print("\n🔍 Checking SQL Server Services:")
    print("-" * 40)
    
    try:
        import subprocess
        
        # Check SQL Server services
        services_to_check = [
            "MSSQLSERVER",
            "SQLSERVERAGENT", 
            "SQLBrowser",
            "MSSQL$SQLEXPRESS"
        ]
        
        for service in services_to_check:
            try:
                result = subprocess.run(
                    ["sc", "query", service], 
                    capture_output=True, 
                    text=True, 
                    shell=True
                )
                
                if "RUNNING" in result.stdout:
                    print(f"✅ {service}: RUNNING")
                elif "STOPPED" in result.stdout:
                    print(f"⏹️  {service}: STOPPED")
                else:
                    print(f"❓ {service}: UNKNOWN STATE")
                    
            except Exception as e:
                print(f"❌ {service}: Could not check ({e})")
                
    except ImportError:
        print("❌ Service check not available on this platform")

def network_connectivity_test():
    """Test network connectivity to SQL Server"""
    print("\n🌐 Network Connectivity Test:")
    print("-" * 40)
    
    import socket
    
    # Extract hostname from the full server name
    host = "DESKTOP-1VHT16K"
    ports_to_test = [1433, 1434]  # 1433 = default, 1434 = SQL Server Browser
    
    for port in ports_to_test:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            result = sock.connect_ex((host, port))
            sock.close()
            
            if result == 0:
                print(f"✅ {host}:{port} - Port is open")
            else:
                print(f"❌ {host}:{port} - Port is closed or unreachable")
                
        except Exception as e:
            print(f"❌ {host}:{port} - Error: {e}")

def main():
    """Run comprehensive SQL Server diagnostics"""
    print("=" * 60)
    print("🔧 SQL Server Connection Diagnostics")
    print("=" * 60)
    
    # 1. Check ODBC drivers
    drivers = test_odbc_drivers()
    
    if not drivers:
        print("\n❌ No SQL Server ODBC drivers found!")
        print("Please install ODBC Driver 17 for SQL Server")
        return
    
    # 2. Check SQL Server services
    check_sql_server_services()
    
    # 3. Test network connectivity
    network_connectivity_test()
    
    # 4. Test connection variations
    working_config = test_connection_variations()
    
    print("\n" + "=" * 60)
    print("📋 DIAGNOSTIC SUMMARY")
    print("=" * 60)
    
    if working_config:
        print("✅ CONNECTION SUCCESSFUL!")
        print(f"✅ Working configuration: {working_config['name']}")
        print("\n🔧 Suggested Fix:")
        print("Update your db_connectors.py with this connection string format")
    else:
        print("❌ NO WORKING CONNECTION FOUND")
        print("\n🔧 Troubleshooting Steps:")
        print("1. Ensure SQL Server (SQLEXPRESS) service is running")
        print("2. Check SQL Server Configuration Manager")
        print("3. Verify SQL Server Authentication is enabled")
        print("4. Confirm the instance name is correct")
        print("5. Check Windows Firewall settings")
        print("6. Verify 'sa' account is enabled and password is correct")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
