"""
Storage service using NeonDB PostgreSQL instead of Firebase
"""
import os
from typing import List, Dict
from sqlalchemy.orm import Session
from app.models.database import SessionLocal, ChatMessage, UserFile

class StorageService:
    """Storage service using NeonDB PostgreSQL"""
    
    def __init__(self):
        pass
    
    def _get_db(self) -> Session:
        """Get database session"""
        return SessionLocal()
    
    # --- File Registry Methods ---
    
    def add_files(self, user_id: str, filenames: List[str]):
        """Add files to user's registry"""
        db = self._get_db()
        try:
            for filename in filenames:
                # Check if file already exists
                existing = db.query(UserFile).filter(
                    UserFile.user_email == user_id,
                    UserFile.filename == filename
                ).first()
                
                if not existing:
                    user_file = UserFile(user_email=user_id, filename=filename)
                    db.add(user_file)
            
            db.commit()
        finally:
            db.close()
    
    def remove_file(self, user_id: str, filename: str) -> bool:
        """Remove file from user's registry"""
        db = self._get_db()
        try:
            result = db.query(UserFile).filter(
                UserFile.user_email == user_id,
                UserFile.filename == filename
            ).delete()
            db.commit()
            return result > 0
        finally:
            db.close()
    
    def get_files(self, user_id: str) -> List[str]:
        """Get list of user's files"""
        db = self._get_db()
        try:
            files = db.query(UserFile).filter(
                UserFile.user_email == user_id
            ).all()
            return [f.filename for f in files]
        finally:
            db.close()
    
    # --- Chat History Methods ---
    
    def get_history(self, user_id: str) -> List[Dict[str, str]]:
        """Get chat history for user"""
        if not user_id:
            return []
        
        db = self._get_db()
        try:
            messages = db.query(ChatMessage).filter(
                ChatMessage.user_email == user_id
            ).order_by(ChatMessage.created_at).all()
            
            return [
                {"role": msg.role, "content": msg.content}
                for msg in messages
            ]
        finally:
            db.close()
    
    def save_message(self, user_id: str, role: str, content: str):
        """Save a chat message"""
        if not user_id:
            return
        
        db = self._get_db()
        try:
            message = ChatMessage(
                user_email=user_id,
                role=role,
                content=content
            )
            db.add(message)
            db.commit()
        finally:
            db.close()
    
    def clear_history(self, user_id: str):
        """Clear chat history for user"""
        if not user_id:
            return
        
        db = self._get_db()
        try:
            db.query(ChatMessage).filter(
                ChatMessage.user_email == user_id
            ).delete()
            db.commit()
        finally:
            db.close()

# Singleton instance
storage = StorageService()
