#!/usr/bin/env python3
"""
Quick MongoDB Connection Test
Tests the specific configuration that's failing in your app.
"""

import pymongo
import sys

def test_books_library_connection():
    """Test connection to books_library database with master/admin123 credentials"""
    
    print("Testing MongoDB Connection to books_library...")
    print("=" * 50)
    
    # Configuration from your error logs
    configs = [
        {
            "name": "Database as auth source",
            "host": "localhost",
            "port": 27017,
            "username": "master",
            "password": "admin123",
            "database": "books_library",
            "authSource": "books_library"
        },
        {
            "name": "Admin as auth source", 
            "host": "localhost",
            "port": 27017,
            "username": "master",
            "password": "admin123",
            "database": "books_library",
            "authSource": "admin"
        },
        {
            "name": "No auth source specified",
            "host": "localhost",
            "port": 27017,
            "username": "master",
            "password": "admin123",
            "database": "books_library"
        },
        {
            "name": "URI format with database auth",
            "uri": "mongodb://master:admin123@localhost:27017/books_library?authSource=books_library"
        },
        {
            "name": "URI format with admin auth",
            "uri": "mongodb://master:admin123@localhost:27017/books_library?authSource=admin"
        }
    ]
    
    successful_config = None
    
    for config in configs:
        print(f"\n🔍 Testing: {config['name']}")
        print("-" * 40)
        
        try:
            if "uri" in config:
                print(f"URI: {config['uri']}")
                client = pymongo.MongoClient(
                    config["uri"],
                    serverSelectionTimeoutMS=5000
                )
            else:
                connection_params = {
                    "host": config["host"],
                    "port": config["port"],
                    "username": config["username"],
                    "password": config["password"],
                    "serverSelectionTimeoutMS": 5000,
                    "connectTimeoutMS": 10000
                }
                
                if "authSource" in config:
                    connection_params["authSource"] = config["authSource"]
                    
                print(f"Params: {config}")
                client = pymongo.MongoClient(**connection_params)
            
            # Test connection
            print("Testing server ping...")
            client.admin.command('ping')
            print("✅ Server ping: SUCCESS")
            
            # Test database access
            print("Testing database access...")
            db = client[config.get("database", "books_library")]
            collections = db.list_collection_names()
            print(f"✅ Database access: SUCCESS")
            print(f"📚 Found {len(collections)} collections: {collections}")
            
            # Test a simple find operation if there are collections
            if collections:
                test_collection = db[collections[0]]
                count = test_collection.count_documents({})
                print(f"📄 Collection '{collections[0]}' has {count} documents")
            
            successful_config = config
            client.close()
            print("🎉 This configuration works!")
            break
            
        except pymongo.errors.AuthenticationFailed as e:
            print(f"❌ Authentication failed: {e}")
            print("   Possible causes:")
            print("   - Wrong username/password")
            print("   - Wrong authSource")
            print("   - User doesn't have access to this database")
            
        except pymongo.errors.ServerSelectionTimeoutError as e:
            print(f"❌ Server selection timeout: {e}")
            print("   Possible causes:")
            print("   - MongoDB server not running")
            print("   - Wrong host/port")
            print("   - Network connectivity issues")
            
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            print(f"   Error type: {type(e)}")
    
    print("\n" + "=" * 50)
    if successful_config:
        print("🎉 SUCCESS! Found working configuration:")
        print(f"Configuration: {successful_config}")
    else:
        print("❌ No working configuration found.")
        print("\n💡 Troubleshooting suggestions:")
        print("1. Check MongoDB server status:")
        print("   - Run: mongosh --eval 'db.runCommand(\"ping\")'")
        print("2. Check if user exists and has correct permissions:")
        print("   - Connect as admin: mongosh admin -u admin -p")
        print("   - Check users: db.getUsers()")
        print("3. Create user if needed:")
        print("   use books_library")
        print("   db.createUser({user:'master', pwd:'admin123', roles:['readWrite']})")
        print("4. Check authentication method:")
        print("   - Some MongoDB setups require admin authSource")

if __name__ == "__main__":
    test_books_library_connection()
