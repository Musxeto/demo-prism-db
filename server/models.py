from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    host = Column(String)
    port = Column(Integer)
    username = Column(String)
    password = Column(String)
    database = Column(String)
    database_type = Column(String, default="mysql")  # Added database_type column matching the migration script
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    queries = relationship("Query", back_populates="connection")
    saved_queries = relationship("SavedQuery", back_populates="connection")

class Query(Base):
    __tablename__ = "queries"

    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("connections.id"))
    sql = Column(String)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    connection = relationship("Connection", back_populates="queries")

class SavedQuery(Base):
    __tablename__ = "saved_queries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    sql = Column(Text)
    connection_id = Column(Integer, ForeignKey("connections.id"))
    category = Column(String, default="General")
    tags = Column(String, nullable=True)  # Comma-separated tags
    is_favorite = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    connection = relationship("Connection", back_populates="saved_queries")
