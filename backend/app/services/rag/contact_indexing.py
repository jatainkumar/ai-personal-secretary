"""
Contact Indexing - Contact-specific vectorstore operations

Handles:
- Creating contact card documents
- Indexing contacts to vectorstore
- Deleting individual contacts
- Batch deleting multiple contacts
"""

import os
from typing import List, Dict, Optional
from dotenv import load_dotenv

from langchain_core.documents import Document
from pinecone import Pinecone

from .vectorstore import setup_pinecone_vectorstore
from .document_loaders import split_documents

load_dotenv()


def create_contact_card_document(person: Dict, source: str = "VCF Enrichment") -> Document:
    """
    Create a Document object from a person dict for indexing to vector store.
    This ensures VCF-enriched contacts are searchable in the RAG system.
    
    Args:
        person: Dictionary with person data (first_name, last_name, email, phone, etc.)
        source: Source description for the contact (defaults to "VCF Enrichment")
    
    Returns:
        Document object with formatted contact card content and metadata
    """
    first = person.get('first_name', '') or ''
    last = person.get('last_name', '') or ''
    full_name = f"{first} {last}".strip()
    
    email = person.get('email', '') or ''
    phone = person.get('phone', '') or ''
    company = person.get('company', '') or ''
    position = person.get('position', '') or ''
    url = person.get('url', '') or ''
    address = person.get('address', '') or ''
    birthday = person.get('birthday', '') or ''
    notes = person.get('notes', '') or ''
    
    # Build contact card content
    content_lines = [
        "--- CONTACT CARD ---",
        f"Name: {full_name}",
    ]
    
    if position:
        content_lines.append(f"Position: {position}")
    if company:
        content_lines.append(f"Company: {company}")
    if email:
        content_lines.append(f"Email: {email}")
    if phone:
        content_lines.append(f"Phone: {phone}")
    if address:
        content_lines.append(f"Address: {address}")
    if birthday:
        content_lines.append(f"Birthday: {birthday}")
    if url:
        content_lines.append(f"URL: {url}")
    if notes:
        content_lines.append(f"Notes: {notes}")
    
    content_lines.append(f"Source: {source}")
    
    content = "\\n".join(content_lines)
    
    # Create metadata for better searchability
    metadata = {
        "source": source,
        "type": "contact_card",
        "person_name": full_name,
        "company": company,
        "email": email
    }
    
    return Document(page_content=content, metadata=metadata)


def index_person_to_vectorstore(
    user_id: str, 
    person: Dict, 
    source: str = "VCF Enrichment", 
    namespace: Optional[str] = None
) -> bool:
    """
    Index a person's contact information to Pinecone for RAG queries.
    This makes the contact searchable via the chat interface.
    
    Args:
        user_id: User ID for namespacing
        person: Dictionary with person data
        source: Source description (e.g., "VCF Enrichment", "Manual Entry")
        namespace: Optional specific namespace to index to. If None, uses user_id as namespace.
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Create contact card document
        doc = create_contact_card_document(person, source)
        
        # Split into chunks
        chunks = split_documents([doc])
        
        # Add person metadata to chunks
        person_id = person.get('id', '')
        first = person.get('first_name', '') or ''
        last = person.get('last_name', '') or ''
        person_name = f"{first} {last}".strip()
        person_company = person.get('company', '')
        person_position = person.get('position', '')
        
        for chunk in chunks:
            if person_id:
                chunk.metadata['person_id'] = person_id
            chunk.metadata['person_name'] = person_name
            if person_company:
                chunk.metadata['person_company'] = person_company
            if person_position:
                chunk.metadata['person_position'] = person_position
        
        # Index to Pinecone
        target_namespace = namespace if namespace is not None else user_id
        setup_pinecone_vectorstore(chunks, namespace=target_namespace)
        
        print(f"✅ Indexed contact '{person_name}' to vector store namespace '{target_namespace}'")
        return True
        
    except Exception as e:
        print(f"❌ Error indexing person to vector store: {e}")
        import traceback
        traceback.print_exc()
        return False


def delete_person_from_vectorstore(user_id: str, person_id: str, person_name: str = "") -> bool:
    """
    Delete a person's data from Pinecone vector store.
    Removes data from ALL namespaces (main, person-specific, and LinkedIn-specific).
    
    Args:
        user_id: User ID
        person_id: Person's unique ID
        person_name: Person's name (for logging)
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("PINECONE_API_KEY missing in .env")
        
        pc = Pinecone(api_key=api_key)
        index = pc.Index("rag-app-index")
        
        # Delete from main namespace
        try:
            index.delete(filter={"person_id": {"$eq": person_id}}, namespace=user_id)
            print(f"✅ Deleted {person_name or person_id} from main namespace '{user_id}'")
        except Exception as e:
            print(f"⚠️ Error deleting from main namespace: {e}")
        
        # Find and delete person-specific namespaces
        try:
            stats = index.describe_index_stats()
            all_namespaces = stats.get('namespaces', {}).keys()
            
            person_prefix = f"{user_id}_person_"
            person_namespaces = [ns for ns in all_namespaces if ns.startswith(person_prefix)]
            
            print(f"🔍 Searching {len(person_namespaces)} person namespaces for person_id={person_id}")
            
            deleted_count = 0
            for person_ns in person_namespaces:
                should_delete = False
                
                if person_ns == f"{user_id}_person_{person_id}":
                    should_delete = True
                else:
                    try:
                        index.delete(
                            filter={"person_id": {"$eq": person_id}}, 
                            namespace=person_ns
                        )
                        print(f"✅ Deleted person data from namespace '{person_ns}' using metadata filter")
                        deleted_count += 1
                        continue
                    except Exception:
                        pass
                
                if should_delete:
                    try:
                        index.delete(delete_all=True, namespace=person_ns)
                        print(f"✅ Deleted person-specific namespace '{person_ns}'")
                        deleted_count += 1
                    except Exception as e:
                        error_str = str(e)
                        if "404" in error_str or "not found" in error_str.lower():
                            print(f"ℹ️ Namespace '{person_ns}' already deleted or empty")
                        else:
                            print(f"⚠️ Error deleting namespace '{person_ns}': {e}")
            
            if deleted_count == 0:
                print(f"ℹ️ No person-specific namespaces found for person_id={person_id}")
            else:
                print(f"✅ Deleted data from {deleted_count} person namespaces")
                
        except Exception as e:
            print(f"⚠️ Error finding/deleting person-specific namespaces: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error deleting person from vector store: {e}")
        import traceback
        traceback.print_exc()
        return False


def delete_persons_batch_from_vectorstore(user_id: str, person_ids: List[str]) -> bool:
    """
    Delete multiple persons from vector store in batched operations.
    OPTIMIZED: Uses $in filter for batch deletion instead of individual calls.
    
    Args:
        user_id: User ID (email)
        person_ids: List of person IDs to delete
    
    Returns:
        bool: True if successful
    """
    try:
        if not person_ids:
            print("ℹ️ No person IDs provided for batch deletion")
            return True
        
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("PINECONE_API_KEY missing in .env")
        
        pc = Pinecone(api_key=api_key)
        index = pc.Index("rag-app-index")
        
        print(f"🚀 Batch deleting {len(person_ids)} contacts from vector store...")
        
        # Delete from main namespace using $in filter (BATCH)
        try:
            index.delete(
                filter={"person_id": {"$in": person_ids}},
                namespace=user_id
            )
            print(f"✅ Batch deleted {len(person_ids)} contacts from main namespace '{user_id}'")
        except Exception as e:
            print(f"⚠️ Error batch deleting from main namespace: {e}")
        
        # Get all namespaces ONCE
        try:
            stats = index.describe_index_stats()
            all_namespaces = stats.get('namespaces', {}).keys()
            
            person_prefix = f"{user_id}_person_"
            person_namespaces = [ns for ns in all_namespaces if ns.startswith(person_prefix)]
            
            print(f"🔍 Found {len(person_namespaces)} person namespaces to clean")
            
            # Batch delete from each namespace
            deleted_namespaces = 0
            for person_ns in person_namespaces:
                try:
                    index.delete(
                        filter={"person_id": {"$in": person_ids}},
                        namespace=person_ns
                    )
                    print(f"✅ Batch deleted from namespace '{person_ns}'")
                    deleted_namespaces += 1
                except Exception as e:
                    error_str = str(e)
                    if "404" not in error_str and "not found" not in error_str.lower():
                        print(f"⚠️ Error deleting from namespace '{person_ns}': {e}")
            
            if deleted_namespaces > 0:
                print(f"✅ Cleaned {deleted_namespaces} person namespaces")
            
        except Exception as e:
            print(f"⚠️ Error processing person namespaces: {e}")
        
        print(f"🎉 Batch deletion complete for {len(person_ids)} contacts")
        return True
        
    except Exception as e:
        print(f"❌ Error in batch deletion: {e}")
        import traceback
        traceback.print_exc()
        return False
