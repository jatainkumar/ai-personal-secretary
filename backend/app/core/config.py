"""
Core configuration and settings
"""
import os
from dotenv import load_dotenv

load_dotenv()

# API Settings
API_TITLE = "AI Personal Secretary API"
API_VERSION = "1.0.0"

# Google OAuth2 (for Calendar API)
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
OAUTH_REDIRECT_URI = os.getenv("OAUTH_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# LLM Provider API Keys (at least one required)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

# Database
DATABASE_URL = os.getenv("DATABASE_URL")

# Security
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
CREDENTIAL_ENCRYPTION_KEY = os.getenv("CREDENTIAL_ENCRYPTION_KEY")

# Pinecone
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "ai-secretary")

# OAuth Scopes
OAUTH_SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
]

# ====================================
# Storage Configuration
# ====================================
from pathlib import Path
import uuid

# Base directories
UPLOAD_DIR = Path("temp_data")
DATA_DIR = Path("data")

def get_user_upload_dir(user_id: str, session_id: str = None) -> Path:
    """
    Get consistent upload directory for a user.
    
    Args:
        user_id: User's email/ID
        session_id: Optional session UUID (auto-generated if not provided)
    
    Returns:
        Path object: temp_data/{user_id}/{session_id}
    """
    session_id = session_id or str(uuid.uuid4())
    return UPLOAD_DIR / user_id / session_id

def normalize_path_for_filter(user_id: str, filename: str) -> str:
    """
    Normalize path to forward slashes for consistent Pinecone filtering.
    
    Args:
        user_id: User's email/ID
        filename: Filename to include in path
    
    Returns:
        Normalized path string with forward slashes
    """
    return f"temp_data/{user_id}/{filename}".replace("\\", "/")

