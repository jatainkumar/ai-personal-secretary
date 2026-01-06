"""
Authentication service for Google OAuth2 and JWT session management
"""
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from cryptography.fernet import Fernet
import jwt
import os
from datetime import datetime, timedelta
from typing import Optional, Dict
from sqlalchemy.orm import Session
from app.models.database import User, UserCredential
from app.core.config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    OAUTH_REDIRECT_URI,
    OAUTH_SCOPES,
    JWT_SECRET_KEY,
    CREDENTIAL_ENCRYPTION_KEY
)

if not JWT_SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY environment variable is not set")

if not CREDENTIAL_ENCRYPTION_KEY:
    raise ValueError("CREDENTIAL_ENCRYPTION_KEY environment variable is not set")

# Initialize Fernet cipher for encryption
cipher = Fernet(CREDENTIAL_ENCRYPTION_KEY.encode() if len(CREDENTIAL_ENCRYPTION_KEY) == 44 else Fernet.generate_key())



def create_oauth_flow(state: Optional[str] = None) -> Flow:
    """Create Google OAuth2 flow"""
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [OAUTH_REDIRECT_URI]
            }
        },
        scopes=OAUTH_SCOPES,
        redirect_uri=OAUTH_REDIRECT_URI
    )
    
    if state:
        flow.state = state
    
    return flow


def encrypt_token(token: str) -> str:
    """Encrypt a token for storage"""
    return cipher.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a stored token"""
    return cipher.decrypt(encrypted_token.encode()).decode()


def save_user_credentials(db: Session, user_id: int, credentials: Credentials) -> None:
    """Save or update user's Google OAuth credentials"""
    # Check if credentials already exist
    user_cred = db.query(UserCredential).filter(UserCredential.user_id == user_id).first()
    
    # Encrypt tokens
    encrypted_access = encrypt_token(credentials.token)
    encrypted_refresh = encrypt_token(credentials.refresh_token)
    encrypted_secret = encrypt_token(credentials.client_secret)
    
    if user_cred:
        # Update existing credentials
        user_cred.access_token = encrypted_access
        user_cred.refresh_token = encrypted_refresh
        user_cred.token_uri = credentials.token_uri
        user_cred.client_id = credentials.client_id
        user_cred.client_secret = encrypted_secret
        user_cred.scopes = credentials.scopes
        user_cred.token_expiry = credentials.expiry
        user_cred.updated_at = datetime.utcnow()
    else:
        # Create new credentials
        user_cred = UserCredential(
            user_id=user_id,
            access_token=encrypted_access,
            refresh_token=encrypted_refresh,
            token_uri=credentials.token_uri,
            client_id=credentials.client_id,
            client_secret=encrypted_secret,
            scopes=credentials.scopes,
            token_expiry=credentials.expiry
        )
        db.add(user_cred)
    
    db.commit()


def get_user_credentials(db: Session, user_id: int) -> Optional[Credentials]:
    """Retrieve and decrypt user's Google OAuth credentials"""
    user_cred = db.query(UserCredential).filter(UserCredential.user_id == user_id).first()
    
    if not user_cred:
        return None
    
    # Decrypt tokens
    access_token = decrypt_token(user_cred.access_token)
    refresh_token = decrypt_token(user_cred.refresh_token)
    client_secret = decrypt_token(user_cred.client_secret)
    
    # Create Credentials object
    credentials = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri=user_cred.token_uri,
        client_id=user_cred.client_id,
        client_secret=client_secret,
        scopes=user_cred.scopes
    )
    
    # Set expiry
    credentials.expiry = user_cred.token_expiry
    
    return credentials


def create_session_token(user: User) -> str:
    """Create JWT session token for user"""
    payload = {
        "user_id": user.id,
        "email": user.email,
        "google_id": user.google_id,
        "exp": datetime.utcnow() + timedelta(days=7)  # Token expires in 7 days
    }
    
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")
    return token


def verify_session_token(token: str) -> Optional[Dict]:
    """Verify JWT session token and return user data"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_or_create_user(db: Session, google_id: str, email: str, name: str, picture: str) -> User:
    """Get existing user or create new one"""
    user = db.query(User).filter(User.google_id == google_id).first()
    
    if not user:
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            picture=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update user info if changed
        if user.name != name or user.picture != picture:
            user.name = name
            user.picture = picture
            db.commit()
    
    return user


def delete_user_credentials(db: Session, user_id: int) -> None:
    """Delete user's OAuth credentials (revoke access)"""
    db.query(UserCredential).filter(UserCredential.user_id == user_id).delete()
    db.commit()
