"""
Query Engine - RAG-based query answering

Handles:
- Semantic search across all namespaces
- Context retrieval from vectorstore
- LLM-based response generation with multiple provider support
- Person-specific namespace searches
"""

import os
from typing import List, Optional
from dotenv import load_dotenv
# Add this near other imports
from app.core.config import PINECONE_INDEX_NAME, PINECONE_API_KEY
from langchain_core.documents import Document
from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from pinecone import Pinecone

from .llm_providers import get_chat_model

load_dotenv()


def query_rag(
    user_id: str,
    query: str,
    api_key: Optional[str] = None,
    model_option: str = "gemini-fast",
    
    gemini_key: Optional[str] = None,
    groq_key: Optional[str] = None,
    nvidia_key: Optional[str] = None
) -> str:
    """
    Query RAG system across all namespaces and generate response
    
    Args:
        user_id: User ID for namespace filtering
        query: User's question
        api_key: Optional API key (deprecated, uses env vars now)
        model_option: LLM model to use (gemini-fast, llama3-fast, llama3-smart, nvidia-smart, etc.)
    
    Returns:
        str: Generated response with citations
    """
    # Special handling for contact count queries
    query_lower = query.lower()
    if any(phrase in query_lower for phrase in ["how many contact", "number of contact", "count of contact", "total contact"]):
        try:
            from app.models.database import get_db, Person
            from sqlalchemy import func
            
            db = next(get_db())
            total_contacts = db.query(Person).filter(Person.user_email == user_id).count()
            
            # Get contact with position "sigma" if asked
            response_parts = [f"You have {total_contacts} contacts."]
            
            if "sigma" in query_lower:
                sigma_contacts = db.query(Person).filter(
                    Person.user_email == user_id,
                    func.lower(Person.position).like('%sigma%')
                ).all()
                
                if sigma_contacts:
                    response_parts.append("\n\nThe contact who is a \"sigma\" is:")
                    for person in sigma_contacts:
                        info = f"- **{person.first_name} {person.last_name}**"
                        if person.position:
                            info += f" (Position: {person.position}"
                        if person.company:
                            info += f", Company: {person.company}"
                        if person.position:
                            info += ")"
                        if person.email:
                            info += f", Email: {person.email}"
                        
                        # Check if manually created
                        from app.models.database import UploadedFile
                        files = db.query(UploadedFile).filter(
                            UploadedFile.user_email == user_id,
                            UploadedFile.person_id == person.id
                        ).all()
                        
                        if not files:
                            info += " - According to Manual Creation."
                        
                        response_parts.append(info)
                else:
                    response_parts.append("\n\nNo contacts with position containing \"sigma\" were found.")
                    
            return "\n".join(response_parts)
            
        except Exception as e:
            print(f"DEBUG: Error querying database for contact count: {e}")
            # Fall through to normal RAG query
    
    # Special handling for duplicate detection queries
    if any(phrase in query_lower for phrase in [
        "common name", "duplicate", "same name", "same contact",
        "repeated name", "multiple contact"
    ]):
        try:
            from app.models.database import get_db, Person
            from collections import defaultdict
            
            db = next(get_db())
            
            # Get all contacts for this user
            all_contacts = db.query(Person).filter(
                Person.user_email == user_id
            ).all()
            
            # Group contacts by full name (case-insensitive)
            name_groups = defaultdict(list)
            for contact in all_contacts:
                # Create normalized full name
                full_name = f"{contact.first_name or ''} {contact.last_name or ''}".strip().lower()
                if full_name:  # Only consider contacts with names
                    name_groups[full_name].append(contact)
            
            # Find actual duplicates (appearing 2+ times)
            duplicates = {
                name: contacts 
                for name, contacts in name_groups.items() 
                if len(contacts) >= 2
            }
            
            if not duplicates:
                return "No duplicate contacts found. All contacts in your list have unique names."
            
            # Format response with duplicate details
            response_parts = [
                f"Found {len(duplicates)} duplicate contact name(s):\n"
            ]
            
            for name, contacts in duplicates.items():
                response_parts.append(f"\n**{name.title()}** ({len(contacts)} entries):")
                for idx, contact in enumerate(contacts, 1):
                    details = []
                    if contact.email:
                        details.append(f"Email: {contact.email}")
                    if contact.company:
                        details.append(f"Company: {contact.company}")
                    if contact.position:
                        details.append(f"Position: {contact.position}")
                    
                    detail_str = ", ".join(details) if details else "No additional details"
                    response_parts.append(f"  {idx}. {detail_str}")
            
            return "\n".join(response_parts)
            
        except Exception as e:
            print(f"DEBUG: Error checking for duplicates: {e}")
            # Fall through to normal RAG query
    
    # Special handling for contact information queries
    contact_keywords = ["email", "phone", "contact", "company", "position", 
                        "work", "job", "title", "address", "birthday"]
    
    if any(keyword in query_lower for keyword in contact_keywords):
        try:
            from app.models.database import get_db, Person
            from sqlalchemy import or_, func
            import re
            
            db = next(get_db())
            
            # Pattern 1: List all contacts
            if any(phrase in query_lower for phrase in ["list all", "show all", "all contact", "all my contact"]):
                contacts = db.query(Person).filter(Person.user_email == user_id).all()
                
                if not contacts:
                    return "You don't have any contacts yet."
                
                response_parts = [f"You have {len(contacts)} contact(s):\n"]
                for person in contacts:
                    name = f"{person.first_name or ''} {person.last_name or ''}".strip()
                    details = []
                    if person.email:
                        details.append(f"Email: {person.email}")
                    if person.phone:
                        details.append(f"Phone: {person.phone}")
                    if person.company:
                        details.append(f"Company: {person.company}")
                    if person.position:
                        details.append(f"Position: {person.position}")
                    
                    detail_str = ", ".join(details) if details else "No details"
                    response_parts.append(f"- **{name}**: {detail_str}")
                
                return "\n".join(response_parts)
            
            # Pattern 2: Filter by company ("at X", "work at X", "contacts at X")
            if any(phrase in query_lower for phrase in ["at ", "work at", "works at"]):
                # Extract company name
                words = query_lower.split()
                company_keywords = []
                
                for phrase in ["at", "works", "work"]:
                    if phrase in words:
                        idx = words.index(phrase)
                        # Skip "at" and take next words
                        start_idx = idx + 1
                        if phrase in ["works", "work"] and idx + 1 < len(words) and words[idx + 1] == "at":
                            start_idx = idx + 2
                        
                        if start_idx < len(words):
                            # Take next 1-3 words as company name
                            company_keywords = words[start_idx:min(start_idx + 3, len(words))]
                            break
                
                if company_keywords:
                    company_search = " ".join(company_keywords)
                    contacts = db.query(Person).filter(
                        Person.user_email == user_id,
                        func.lower(Person.company).like(f'%{company_search}%')
                    ).all()
                    
                    if not contacts:
                        return f"No contacts found working at or associated with '{company_search}'."
                    
                    response_parts = [f"Found {len(contacts)} contact(s) associated with '{company_search}':\n"]
                    for person in contacts:
                        name = f"{person.first_name or ''} {person.last_name or ''}".strip()
                        details = []
                        if person.email:
                            details.append(f"Email: {person.email}")
                        if person.phone:
                            details.append(f"Phone: {person.phone}")
                        if person.position:
                            details.append(f"Position: {person.position}")
                        
                        detail_str = ", ".join(details) if details else "No additional details"
                        response_parts.append(f"- **{name}**: {detail_str}")
                    
                    return "\n".join(response_parts)
            
            # Pattern 3: Filter by position/job title
            if any(phrase in query_lower for phrase in ["developer", "engineer", "manager", "designer", 
                                                         "analyst", "position", "job", "role"]):
                # Extract position keywords
                position_terms = ["developer", "engineer", "manager", "designer", "analyst", 
                                 "director", "ceo", "cto", "vp", "lead", "senior", "junior"]
                
                found_positions = [term for term in position_terms if term in query_lower]
                
                if found_positions:
                    position_search = found_positions[0]
                    contacts = db.query(Person).filter(
                        Person.user_email == user_id,
                        func.lower(Person.position).like(f'%{position_search}%')
                    ).all()
                    
                    if not contacts:
                        return f"No contacts found with position containing '{position_search}'."
                    
                    response_parts = [f"Found {len(contacts)} contact(s) with '{position_search}' in their position:\n"]
                    for person in contacts:
                        name = f"{person.first_name or ''} {person.last_name or ''}".strip()
                        details = []
                        if person.position:
                            details.append(f"Position: {person.position}")
                        if person.company:
                            details.append(f"Company: {person.company}")
                        if person.email:
                            details.append(f"Email: {person.email}")
                        
                        detail_str = ", ".join(details) if details else "No additional details"
                        response_parts.append(f"- **{name}**: {detail_str}")
                    
                    return "\n".join(response_parts)
            
            # Pattern 4: Search for specific person by name
            # Extract capitalized words as potential names (simple heuristic)
            potential_names = re.findall(r'\b[A-Z][a-z]+\b', query)
            
            if potential_names:
                # Search for persons matching any of these names in first or last name
                conditions = []
                for name in potential_names:
                    conditions.append(func.lower(Person.first_name).like(f'%{name.lower()}%'))
                    conditions.append(func.lower(Person.last_name).like(f'%{name.lower()}%'))
                
                contacts = db.query(Person).filter(
                    Person.user_email == user_id,
                    or_(*conditions)
                ).all()
                
                if contacts:
                    # Check if query is asking about files/documents
                    asking_about_files = any(term in query_lower for term in 
                                            ["file", "document", "upload", "pdf", "doc", "attached"])
                    
                    response_parts = []
                    for person in contacts:
                        name = f"{person.first_name or ''} {person.last_name or ''}".strip()
                        response_parts.append(f"**{name}:**")
                        
                        # Show contact details unless only asking about files
                        if not asking_about_files or len(contacts) > 1:
                            if person.email:
                                response_parts.append(f"- Email: {person.email}")
                            if person.phone:
                                response_parts.append(f"- Phone: {person.phone}")
                            if person.company:
                                response_parts.append(f"- Company: {person.company}")
                            if person.position:
                                response_parts.append(f"- Position: {person.position}")
                            if person.address:
                                response_parts.append(f"- Address: {person.address}")
                            if person.birthday:
                                response_parts.append(f"- Birthday: {person.birthday}")
                            if person.url:
                                response_parts.append(f"- LinkedIn: {person.url}")
                        
                        # If asking about files or showing full details, list uploaded files
                        if asking_about_files or "file" in query_lower:
                            from app.models.database import UploadedFile
                            files = db.query(UploadedFile).filter(
                                UploadedFile.user_email == user_id,
                                UploadedFile.person_id == person.id
                            ).all()
                            
                            if files:
                                response_parts.append(f"- **Uploaded Files ({len(files)}):**")
                                for file in files:
                                    response_parts.append(f"  - {file.filename}")
                            else:
                                response_parts.append(f"- No files uploaded for this contact")
                        
                        response_parts.append("")  # Blank line between contacts
                    
                    return "\n".join(response_parts)
        
        except Exception as e:
            print(f"DEBUG: Error querying contacts: {e}")
            # Fall through to normal RAG query
    
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")
    
    # Search main user namespace
    vectorstore = PineconeVectorStore.from_existing_index(
        index_name="ai-secretary",
        embedding=embeddings,
        namespace=user_id
    )
    
    docs = vectorstore.similarity_search(query, k=50)
    
    # Also search person-specific namespaces
    try:
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        index = pc.Index("ai-secretary")
        
        # Get index stats to find all namespaces
        stats = index.describe_index_stats()
        all_namespaces = stats.get('namespaces', {}).keys()
        
        # Filter for person-specific namespaces for this user
        person_prefix = f"{user_id}_person_"
        person_namespaces = [ns for ns in all_namespaces if ns.startswith(person_prefix)]
        
        print(f"DEBUG: Searching {len(person_namespaces)} person namespaces for user {user_id}")
        
        # Search each person namespace and combine results
        for person_ns in person_namespaces:
            try:
                person_vectorstore = PineconeVectorStore.from_existing_index(
                    index_name="ai-secretary",
                    embedding=embeddings,
                    namespace=person_ns
                )
                person_docs = person_vectorstore.similarity_search(query, k=10)
                docs.extend(person_docs)
                print(f"DEBUG: Found {len(person_docs)} docs in namespace {person_ns}")
            except Exception as e:
                print(f"DEBUG: Error searching person namespace {person_ns}: {e}")
                continue
                
    except Exception as e:
        print(f"DEBUG: Could not search person namespaces: {e}")

    context_data = []
    for d in docs:
        source_file = d.metadata.get("source", "Unknown File")
        filename = os.path.basename(source_file)
        
        # Check if this document is related to a specific person
        person_name = d.metadata.get("person_name")
        person_company = d.metadata.get("person_company")
        person_position = d.metadata.get("person_position")
        
        if person_name:
            # Include person information in the context
            person_info = f"CONTACT: {person_name}"
            if person_position:
                person_info += f", {person_position}"
            if person_company:
                person_info += f" at {person_company}"
            context_data.append(f"--- SOURCE: {filename} ({person_info}) ---\\n{d.page_content}")
        else:
            context_data.append(f"--- SOURCE: {filename} ---\\n{d.page_content}")
    
    context_text = "\\n\\n".join(context_data)

    if not context_text:
        return "I couldn't find any information matching that in your uploaded files."

    print(f"DEBUG: Found {len(docs)} relevant docs for query")
    
    # Use multi-provider LLM factory
    try:
        llm = get_chat_model(
            model_option, 
            gemini_key=gemini_key, 
            groq_key=groq_key, 
            nvidia_key=nvidia_key
        )
    except Exception as e:
        return f"Error initializing model: {e}"
    
    prompt = f"""
    You are a smart and helpful Career Secretary. You have access to snippets of the user's personal files.
    
    YOUR GOAL: Answer the user's question using ONLY the context snippets below.

    RULES:
    1. **Cite Your Sources:** Mention the file name (e.g., "According to connections.csv...").
    2. **Handling Contacts:** If looking for a person, give their Name, Company, and Email if available.
    3. **File-Contact Associations:** If a document source shows "CONTACT: [Name]", that file was uploaded specifically for that contact. When asked about topics/content in those files, mention the associated contact.
    4. **Deduplicate People:** The same person may appear in multiple context snippets from different sources. List each person ONLY ONCE with their most complete information.
    5. **Be Direct:** If the info isn't there, say "I can't find that detail."

    -------------
    CONTEXT SNIPPETS:
    {context_text}
    -------------

    USER QUESTION: {query}

    ANSWER:
    """
    
    try:
        response = llm.invoke(prompt)
        return response.content
    except Exception as e:
        # LLM failed — fallback
        print(f"DEBUG: LLM error: {e}")
        q_lower = query.lower()
        matches = []
        for d in docs:
            person_name = d.metadata.get('person_name') or ''
            content = (d.page_content or "").lower()
            if person_name and person_name.lower() in q_lower:
                matches.append((person_name, d))
            elif any(tok in content for tok in q_lower.split() if len(tok) > 2):
                matches.append((person_name or 'Unknown', d))

        if matches:
            lines = []
            seen = set()
            for name, d in matches:
                if name in seen: 
                    continue
                seen.add(name)
                src = os.path.basename(d.metadata.get('source', 'unknown'))
                lines.append(f"According to {src}: {d.page_content.splitlines()[0][:200]}")
            return "\\n\\n".join(lines)

        return (
            "I couldn't generate an AI response because the configured LLM failed (" +
            f"{str(e)}). Try specifying a supported model in the request or the server environment."
        )
