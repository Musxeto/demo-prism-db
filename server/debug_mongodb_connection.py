#!/usr/bin/env python3
"""
MongoDB Connection Debugging Script
This script helps debug MongoDB connection issues by testing different connection configurations.
"""

import pymongo
import sys
import json
from urllib.parse import quote_plus

def test_mongodb_connection():
    """Test MongoDB connection with various configurations"""
    print("MongoDB Connection Debug Tool")
    print("=" * 50)
    
    # Get connection details
    host = input("MongoDB Host (default: localhost): ").strip() or "localhost"
    port = input("MongoDB Port (default: 27017): ").strip() or "27017"
    database = input("Database name: ").strip()
    username = input("Username (press Enter if no auth): ").strip()
    password = input("Password (press Enter if no auth): ").strip()
    
    print("\n" + "=" * 50)
    print("Testing MongoDB Connection...")
    
    # Test configurations
    configs_to_test = []
    
    if username and password:
        # Test with authentication
        configs_to_test.extend([
            {
                "name": "URI with auth",
                "uri": f"mongodb://{quote_plus(username)}:{quote_plus(password)}@{host}:{port}/{database}",
            },
            {
                "name": "URI with auth (no database in URI)",
                "uri": f"mongodb://{quote_plus(username)}:{quote_plus(password)}@{host}:{port}/",
            },
            {
                "name": "Client parameters with auth",
                "params": {
                    "host": host,
                    "port": int(port),
                    "username": username,
                    "password": password,
                    "authSource": database,
                    "serverSelectionTimeoutMS": 5000
                }
            },
            {
                "name": "Client parameters with admin auth",
                "params": {
                    "host": host,
                    "port": int(port),
                    "username": username,
                    "password": password,
                    "authSource": "admin",
                    "serverSelectionTimeoutMS": 5000
                }
            }
        ])
    else:
        # Test without authentication
        configs_to_test.append({
            "name": "No authentication",
            "uri": f"mongodb://{host}:{port}/",
        })
    
    successful_config = None
    
    for config in configs_to_test:
        print(f"\nTesting: {config['name']}")
        print("-" * 30)
        
        try:
            if "uri" in config:
                print(f"URI: {config['uri']}")
                client = pymongo.MongoClient(config["uri"])
            else:
                print(f"Parameters: {config['params']}")
                client = pymongo.MongoClient(**config["params"])
            
            # Test server selection
            client.admin.command('ping')
            print("✅ Server connection: SUCCESS")
            
            # Test database access
            db = client[database]
            collections = db.list_collection_names()
            print(f"✅ Database access: SUCCESS ({len(collections)} collections found)")
            
            if collections:
                print(f"   Collections: {', '.join(collections[:5])}")
                if len(collections) > 5:
                    print(f"   ... and {len(collections) - 5} more")
            
            successful_config = config
            client.close()
            break
            
        except pymongo.errors.ServerSelectionTimeoutError as e:
            print(f"❌ Server selection timeout: {e}")
        except pymongo.errors.AuthenticationFailed as e:
            print(f"❌ Authentication failed: {e}")
        except pymongo.errors.ConnectionFailure as e:
            print(f"❌ Connection failed: {e}")
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
    
    if successful_config:
        print("\n" + "=" * 50)
        print("✅ SUCCESS! Working configuration found:")
        print(json.dumps(successful_config, indent=2))
        
        print("\nRecommended connection configuration for your app:")
        if "uri" in successful_config:
            print(f"""
Host: {host}
Port: {port}
Database: {database}
Username: {username if username else "(none)"}
Password: {'*' * len(password) if password else "(none)"}
""")
        else:
            print(f"""
Host: {host}
Port: {port}
Database: {database}
Username: {username if username else "(none)"}
Password: {'*' * len(password) if password else "(none)"}
Auth Source: {successful_config['params'].get('authSource', database)}
""")
    else:
        print("\n" + "=" * 50)
        print("❌ No working configuration found.")
        print("\nTroubleshooting suggestions:")
        print("1. Check if MongoDB server is running")
        print("2. Verify host and port are correct")
        print("3. Check username/password are correct")
        print("4. Try different authSource (admin, or your database name)")
        print("5. Check if authentication is required")
        print("6. Verify network connectivity")

if __name__ == "__main__":
    try:
        test_mongodb_connection()
    except KeyboardInterrupt:
        print("\n\nConnection test cancelled.")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
