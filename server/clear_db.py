#!/usr/bin/env python3
"""
Script to clear all data from the database by recreating all tables
"""
import os
import sys

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base
from models import Connection, Query

def clear_database():
    """Drop all tables and recreate them"""
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating fresh tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Database cleared successfully!")

if __name__ == "__main__":
    clear_database()
