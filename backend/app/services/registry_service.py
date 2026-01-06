"""
Registry services using SQLite/PostgreSQL via SQLAlchemy
"""
from typing import List, Dict, Optional, Union
from app.models.database import SessionLocal, UserFile, Person, PersonFile, ChatMessage
from sqlalchemy.exc import SQLAlchemyError

class FileRegistry:
    """File registry service"""
    
    @classmethod
    def add_files(cls, user_id: str, filenames: List[str]):
        """Add files to user's registry (user_id is email)"""
        db = SessionLocal()
        try:
            for filename in filenames:
                # Check if file already exists
                exists = db.query(UserFile).filter(
                    UserFile.user_email == user_id,
                    UserFile.filename == filename
                ).first()
                
                if not exists:
                    file_record = UserFile(user_email=user_id, filename=filename)
                    db.add(file_record)
            db.commit()
        except SQLAlchemyError as e:
            db.rollback()
            print(f"❌ DB Error in add_files: {e}")
            raise
        finally:
            db.close()
    
    @classmethod
    def remove_file(cls, user_id: str, filename: str) -> bool:
        db = SessionLocal()
        try:
            file_record = db.query(UserFile).filter(
                UserFile.user_email == user_id,
                UserFile.filename == filename
            ).first()
            
            if file_record:
                db.delete(file_record)
                db.commit()
                return True
            return False
        finally:
            db.close()
    
    @classmethod
    def get_files(cls, user_id: str) -> List[str]:
        db = SessionLocal()
        try:
            files = db.query(UserFile).filter(UserFile.user_email == user_id).all()
            return [f.filename for f in files]
        finally:
            db.close()


class PersonsRegistry:
    """Persons registry service"""
    
    @classmethod
    def add_persons(cls, user_id: str, persons: List[Dict]) -> List[Dict]:
        """
        Add persons to DB and RETURN them with their new DB IDs.
        This is crucial for indexing to Pinecone with the correct ID.
        """
        db = SessionLocal()
        created_persons = []
        try:
            for person_data in persons:
                # Check for duplicates (simple email or name check)
                # In a real app, you might want more complex deduplication
                existing = None
                if person_data.get('email'):
                    existing = db.query(Person).filter(
                        Person.user_email == user_id, 
                        Person.email == person_data['email']
                    ).first()
                
                if existing:
                    # Update existing? Or skip? Let's skip or return existing
                    created_persons.append(existing.to_dict())
                    continue

                new_person = Person(
                    user_email=user_id,
                    first_name=person_data.get('first_name'),
                    last_name=person_data.get('last_name'),
                    email=person_data.get('email'),
                    phone=person_data.get('phone'),
                    company=person_data.get('company'),
                    position=person_data.get('position'),
                    url=person_data.get('url'),
                    address=person_data.get('address'),
                    birthday=person_data.get('birthday'),
                    notes=person_data.get('notes')
                )
                db.add(new_person)
                db.flush() # Flush to get the ID populated
                created_persons.append(new_person.to_dict())
            
            db.commit()
            return created_persons
        except SQLAlchemyError as e:
            db.rollback()
            print(f"❌ DB Error in add_persons: {e}")
            raise
        finally:
            db.close()
    
    @classmethod
    def get_persons(cls, user_id: str) -> List[Dict]:
        db = SessionLocal()
        try:
            persons = db.query(Person).filter(Person.user_email == user_id).all()
            return [p.to_dict() for p in persons]
        finally:
            db.close()

    @classmethod
    def get_person_by_id(cls, user_id: str, person_id: Union[str, int]) -> Optional[Dict]:
        """Fetch person by ID (handles both string '123' and int 123)"""
        db = SessionLocal()
        try:
            # Ensure person_id is int for DB query
            pid = int(person_id)
            person = db.query(Person).filter(
                Person.id == pid,
                Person.user_email == user_id
            ).first()
            return person.to_dict() if person else None
        except ValueError:
            return None # Handle non-integer ID
        finally:
            db.close()
    
    @classmethod
    def add_file_to_person(cls, user_id: str, person_id: Union[str, int], filename: str) -> bool:
        db = SessionLocal()
        try:
            pid = int(person_id)
            # Verify person belongs to user
            person = db.query(Person).filter(Person.id == pid, Person.user_email == user_id).first()
            if not person: return False

            # Check if file already linked
            exists = db.query(PersonFile).filter(PersonFile.person_id == pid, PersonFile.filename == filename).first()
            if not exists:
                pf = PersonFile(person_id=pid, filename=filename)
                db.add(pf)
                db.commit()
            return True
        except Exception:
            db.rollback()
            return False
        finally:
            db.close()

    @classmethod
    def remove_file_from_person(cls, user_id: str, person_id: Union[str, int], filename: str) -> bool:
        db = SessionLocal()
        try:
            pid = int(person_id)
            # We join Person to ensure the file belongs to a person owned by this user
            person_file = db.query(PersonFile).join(Person).filter(
                PersonFile.person_id == pid,
                Person.user_email == user_id,
                PersonFile.filename == filename
            ).first()
            
            if person_file:
                db.delete(person_file)
                db.commit()
                return True
            return False
        finally:
            db.close()
    
    @classmethod
    def update_person(cls, user_id: str, person_id: Union[str, int], updated_data: Dict) -> bool:
        db = SessionLocal()
        try:
            pid = int(person_id)
            person = db.query(Person).filter(Person.id == pid, Person.user_email == user_id).first()
            if person:
                for key, value in updated_data.items():
                    if hasattr(person, key) and key not in ['id', 'user_email', 'created_at']:
                        setattr(person, key, value)
                db.commit()
                return True
            return False
        finally:
            db.close()
            
    @classmethod
    def delete_person(cls, user_id: str, person_id: Union[str, int]) -> bool:
        db = SessionLocal()
        try:
            pid = int(person_id)
            person = db.query(Person).filter(Person.id == pid, Person.user_email == user_id).first()
            if person:
                db.delete(person)
                db.commit()
                return True
            return False
        finally:
            db.close()
    
    @classmethod
    def delete_all_persons(cls, user_id: str) -> bool:
        """Delete all persons for a user"""
        db = SessionLocal()
        try:
            db.query(Person).filter(Person.user_email == user_id).delete()
            db.commit()
            return True
        except Exception:
            db.rollback()
            return False
        finally:
            db.close()

class ChatHistory:
    """Chat history service"""
    @classmethod
    def get_history(cls, user_id: str) -> List[Dict[str, str]]:
        if not user_id: return []
        db = SessionLocal()
        try:
            messages = db.query(ChatMessage).filter(
                ChatMessage.user_email == user_id
            ).order_by(ChatMessage.created_at).all()
            return [{"role": msg.role, "content": msg.content} for msg in messages]
        finally:
            db.close()
    
    @classmethod
    def save_message(cls, user_id: str, role: str, content: str):
        if not user_id: return
        db = SessionLocal()
        try:
            message = ChatMessage(user_email=user_id, role=role, content=content)
            db.add(message)
            db.commit()
        except Exception as e:
            print(f"Error saving message: {e}")
        finally:
            db.close()

    @classmethod
    def clear_history(cls, user_id: str):
        if not user_id: return
        db = SessionLocal()
        try:
            db.query(ChatMessage).filter(ChatMessage.user_email == user_id).delete()
            db.commit()
        finally:
            db.close()