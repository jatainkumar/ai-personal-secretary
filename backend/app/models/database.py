"""
Database configuration and models for NeonDB PostgreSQL
"""
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv
from app.core.config import DATABASE_URL

load_dotenv()

# Database URL from config - Optional
# Create SQLAlchemy engine only if DATABASE_URL is provided
engine = None
SessionLocal = None

if DATABASE_URL:
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,  # Verify connections before using
            pool_recycle=300,    # Recycle connections after 5 minutes
        )
        # Create session factory
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        print("✅ Database engine created successfully")
    except Exception as e:
        print(f"⚠️  Warning: Database connection failed: {e}")
        print("   App will run without database - using JSON file storage")
else:
    print("⚠️  DATABASE_URL not configured - using JSON file storage")

# Base class for models
Base = declarative_base()


class User(Base):
    """User model for storing Google OAuth user information"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255))
    picture = Column(String(500))  # Google profile picture URL
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to credentials
    credentials = relationship("UserCredential", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"


class UserCredential(Base):
    """User OAuth credentials for Google Calendar API"""
    __tablename__ = "user_credentials"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    access_token = Column(Text, nullable=False)  # Encrypted
    refresh_token = Column(Text, nullable=False)  # Encrypted
    token_uri = Column(String(500), nullable=False)
    client_id = Column(String(500), nullable=False)
    client_secret = Column(Text, nullable=False)  # Encrypted
    scopes = Column(ARRAY(String), nullable=False)
    token_expiry = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to user
    user = relationship("User", back_populates="credentials")
    
    def __repr__(self):
        return f"<UserCredential(user_id={self.user_id})>"


class ChatMessage(Base):
    """Chat message history"""
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), nullable=False, index=True)
    role = Column(String(50), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<ChatMessage(user={self.user_email}, role={self.role})>"


class UserFile(Base):
    """User uploaded files registry"""
    __tablename__ = "user_files"
    
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), nullable=False, index=True)
    filename = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<UserFile(user={self.user_email}, file={self.filename})>"


class Person(Base):
    """Contact/person information"""
    __tablename__ = "persons"
    
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), nullable=False, index=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    company = Column(String(255))
    position = Column(String(255))
    url = Column(String(500))
    address = Column(Text)
    birthday = Column(String(50))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to files
    files = relationship("PersonFile", back_populates="person", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Person(id={self.id}, name={self.first_name} {self.last_name})>"
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'phone': self.phone,
            'company': self.company,
            'position': self.position,
            'url': self.url,
            'address': self.address,
            'birthday': self.birthday,
            'notes': self.notes,
            'files': [f.filename for f in self.files] if self.files else []
        }


class PersonFile(Base):
    """Files associated with specific persons"""
    __tablename__ = "person_files"
    
    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to person
    person = relationship("Person", back_populates="files")
    
    def __repr__(self):
        return f"<PersonFile(person_id={self.person_id}, file={self.filename})>"


def get_db():
    """Dependency for getting database session"""
    if not SessionLocal:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Database not configured")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    if engine:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully")
    else:
        print("⚠️  Skipping database initialization - DATABASE_URL not configured")


if __name__ == "__main__":
    # Create tables when run directly
    init_db()
