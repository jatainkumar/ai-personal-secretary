from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from typing import List, Dict, Optional
import os
import shutil
import json
import uuid
import vobject

# Import Services
from app.services.registry_service import PersonsRegistry, FileRegistry
from app.services.rag import (
    index_person_to_vectorstore, 
    delete_person_from_vectorstore,
    delete_persons_batch_from_vectorstore,  # NEW: Batch deletion
    load_documents,
    split_documents,
    setup_pinecone_vectorstore
)

router = APIRouter()

# --- VCF Logic Helpers ---
# (Kept internal to this module for simplicity, or move to app/utils/vcf_utils.py)

def parse_vcf_files(file_paths: List[str]) -> List[Dict]:
    """Parse VCF files and extract contact information"""
    contacts = []
    for file_path in file_paths:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                vcard_text = f.read()
            for vcard in vobject.readComponents(vcard_text):
                contact = {}
                if hasattr(vcard, 'fn'): contact['full_name'] = str(vcard.fn.value).strip()
                elif hasattr(vcard, 'n'): 
                    n = vcard.n.value
                    contact['full_name'] = f"{n.given} {n.family}".strip()
                
                # Extract fields
                if hasattr(vcard, 'email'): 
                    # Handle list of emails
                    emails = [e.value for e in vcard.contents.get('email', [])]
                    contact['email'] = emails[0] if emails else ""
                
                if hasattr(vcard, 'tel'):
                    phones = [t.value for t in vcard.contents.get('tel', [])] 
                    contact['phone'] = phones[0] if phones else ""
                
                if hasattr(vcard, 'adr'):
                    adr = vcard.adr.value
                    contact['address'] = f"{adr.street}, {adr.city}, {adr.region} {adr.code}".strip(', ')
                if hasattr(vcard, 'bday'): contact['birthday'] = str(vcard.bday.value).strip()
                if hasattr(vcard, 'note'): contact['notes'] = str(vcard.note.value).strip()
                
                if contact.get('full_name'): 
                    contacts.append(contact)
        except Exception as e:
            print(f"Error parsing VCF: {e}")
    return contacts

def match_vcf_to_contact(vcf_contact: Dict, existing_contacts: List[Dict]) -> Dict:
    """Match VCF contact to existing contacts with exact/partial/none logic"""
    vcf_name = vcf_contact.get('full_name', '').strip().lower()
    # Normalize multiple spaces to single space
    vcf_name = ' '.join(vcf_name.split())
    if not vcf_name: 
        return {'match_type': 'none', 'contact': None}
    
    vcf_parts = vcf_name.split()
    
    # 1. EXACT MATCH - Full name matches perfectly
    for contact in existing_contacts:
        c_first = str(contact.get('first_name', '') or '').strip().lower()
        c_last = str(contact.get('last_name', '') or '').strip().lower()
        c_full = f"{c_first} {c_last}".strip()
        
        if vcf_name == c_full:
            return {'match_type': 'exact', 'contact': contact}
    
    # 2. SINGLE NAME MATCH - VCF has one name, match against first OR last name
    # Example: VCF "Arnav" matches DB "Arnav Dave" (first name match)
    # Example: VCF "Lahari" matches DB "Lahari Kashibhatla" (first name match)
    if len(vcf_parts) == 1:
        vcf_single = vcf_parts[0]
        for contact in existing_contacts:
            c_first = str(contact.get('first_name', '') or '').strip().lower()
            c_last = str(contact.get('last_name', '') or '').strip().lower()
            
            # Match if VCF name equals first name OR last name
            if vcf_single == c_first or vcf_single == c_last:
                print(f"DEBUG: Single name match - VCF '{vcf_single}' matched to '{c_first} {c_last}' (partial)")
                return {'match_type': 'partial', 'contact': contact}
    
    # 3. PREFIX MATCH - VCF name is beginning of existing full name
    # Example: VCF "Arnav D" matches DB "Arnav Dave"
    for contact in existing_contacts:
        c_first = str(contact.get('first_name', '') or '').strip().lower()
        c_last = str(contact.get('last_name', '') or '').strip().lower()
        c_full = f"{c_first} {c_last}".strip()
        
        # Check if VCF name is a prefix of the full name (with space boundary)
        if c_full.startswith(vcf_name + ' '):
            print(f"DEBUG: Prefix match - VCF '{vcf_name}' matched to '{c_full}' (partial)")
            return {'match_type': 'partial', 'contact': contact}
    
    # 4. LAST NAME MATCH WITH DIFFERENT FIRST - Existing partial logic
    # Example: VCF "John Smith" matches DB "Jane Smith" (same last name)
    if len(vcf_parts) >= 2:
        vcf_first = vcf_parts[0]
        vcf_last = vcf_parts[-1]
        
        for contact in existing_contacts:
            c_first = str(contact.get('first_name', '') or '').strip().lower()
            c_last = str(contact.get('last_name', '') or '').strip().lower()
            
            # If last name matches and first name is different (possible conflict or update)
            if vcf_last == c_last and c_last:
                # If first names are totally different, it's a partial match (could be relative)
                if vcf_first != c_first:
                    print(f"DEBUG: Last name match - VCF '{vcf_name}' matched to '{c_first} {c_last}' (partial)")
                    return {'match_type': 'partial', 'contact': contact}

    return {'match_type': 'none', 'contact': None}

def enrich_contact(existing: Dict, vcf_data: Dict, overwrite: bool = False) -> Dict:
    enriched = existing.copy()
    fields = ['email', 'phone', 'address', 'birthday', 'notes']
    for field in fields:
        # Only update if VCF has data
        if vcf_data.get(field):
            # Update if overwrite is True OR existing field is empty/None
            if overwrite or not enriched.get(field):
                enriched[field] = vcf_data[field]
    return enriched

# --- Endpoints ---

@router.get("/")
def get_persons(user_id: str = Query(...)):
    """Get all persons for a user (user_id is email)"""
    try:
        user_id = user_id.strip()
        persons = PersonsRegistry.get_persons(user_id)
        return {"persons": persons}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/all")
async def delete_all_persons(user_id: str = Query(...)):
    """Delete all persons for a user from DB and Pinecone"""
    try:
        # 1. Get all persons for logging/cleanup
        persons = PersonsRegistry.get_persons(user_id)
        if not persons:
            return {"message": "No contacts to delete", "deleted_count": 0}
        
        count = len(persons)
        person_ids = [str(p.get('id')) for p in persons]
        
        # 2. OPTIMIZED: Batch delete from Pinecone (Vector Store)
        try:
            delete_persons_batch_from_vectorstore(user_id, person_ids)
        except Exception as e:
            print(f"Warning: Failed to batch delete from vectorstore: {e}")
        
        # 3. Delete all from Database Registry
        if PersonsRegistry.delete_all_persons(user_id):
            return {"message": f"Successfully deleted {count} contacts", "deleted_count": count}
        
        raise HTTPException(status_code=500, detail="Failed to delete all contacts from registry")
    except Exception as e:
        # Re-raise HTTP exceptions, wrap others
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{person_id}")
async def delete_person(person_id: str, user_id: str = Query(...)):
    """Delete person from DB and Pinecone"""
    try:
        # 1. Get person details for logging/cleanup
        # Registry expects ID (int/str handles internal conversion)
        person = PersonsRegistry.get_person_by_id(user_id, person_id)
        if not person: 
            raise HTTPException(status_code=404, detail="Person not found")
        
        person_name = f"{person.get('first_name', '')} {person.get('last_name', '')}".strip()
        
        # 2. Delete from Pinecone (Vector Store)
        # We use the string representation of the ID for Pinecone metadata
        delete_person_from_vectorstore(user_id, str(person_id), person_name)
        
        # 3. Delete from Database Registry
        if PersonsRegistry.delete_person(user_id, person_id):
            return {"message": f"Successfully deleted {person_name}", "person_id": person_id}
        
        raise HTTPException(status_code=500, detail="Failed to delete from registry")
    except Exception as e:
        # Re-raise HTTP exceptions, wrap others
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_person(
    person_data: Dict,
    user_id: str = Query(...)
):
    """Create a new person manually"""
    try:
        # Validate minimal requirements
        if not person_data.get('first_name'):
             raise HTTPException(status_code=400, detail="First name is required")
             
        # Use existing add_persons logic which handles DB insertion
        created_list = PersonsRegistry.add_persons(user_id, [person_data])
        
        if not created_list:
            raise HTTPException(status_code=500, detail="Failed to create contact")
            
        new_person = created_list[0]
        
        # Index to vector store
        try:
            from app.services.rag import create_contact_card_document, split_documents, setup_pinecone_vectorstore
            doc = create_contact_card_document(new_person, "Manual Creation")
            chunks = split_documents([doc])
            setup_pinecone_vectorstore(chunks, namespace=user_id)
        except Exception as e:
            print(f"⚠️ Warning: Failed to index new contact to vector store: {e}")
            
        return {"message": "Contact created successfully", "person": new_person}

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{person_id}")
async def update_person(person_id: str, person_data: Dict, user_id: str = Query(...)):
    """Update a person's details and re-index for RAG"""
    try:
        # 1. Update Registry (DB)
        if not PersonsRegistry.update_person(user_id, person_id, person_data):
            raise HTTPException(status_code=404, detail="Person not found")
            
        # 2. Fetch updated object to get full context
        updated_person = PersonsRegistry.get_person_by_id(user_id, person_id)
        if not updated_person:
             raise HTTPException(status_code=500, detail="Failed to retrieve updated person")

        # 3. Update RAG (Re-index contact card)
        # This refreshes the vector with new data
        index_person_to_vectorstore(user_id, updated_person, "Manual Edit")
        
        return {"message": "Person updated successfully", "person": updated_person}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{person_id}/upload")
async def upload_person_file(
    person_id: str,
    user_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """
    Upload files specific to a contact.
    Indexed into a unique namespace: {user_email}_person_{person_id}
    """
    temp_dir = f"temp_data/{user_id}/{uuid.uuid4()}"
    os.makedirs(temp_dir, exist_ok=True)
    
    saved_paths = []
    filenames = []
    try:
        # 1. Save uploaded files
        for file in files:
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            saved_paths.append(file_path)
            filenames.append(file.filename)
            
        # 2. Parse Documents
        docs = load_documents(saved_paths)
        if not docs:
            raise HTTPException(status_code=400, detail="No extractable text found in files")
            
        chunks = split_documents(docs)
        
        # 3. Attach Metadata (Critical for Retrieval)
        person_info = PersonsRegistry.get_person_by_id(user_id, person_id)
        
        if person_info:
            person_name = f"{person_info.get('first_name', '')} {person_info.get('last_name', '')}".strip()
            
            for chunk in chunks:
                chunk.metadata['person_id'] = str(person_id)
                chunk.metadata['person_name'] = person_name
                chunk.metadata['person_company'] = person_info.get('company', '')
        
        # 4. Index to Person-Specific Namespace
        person_namespace = f"{user_id}_person_{person_id}"
        setup_pinecone_vectorstore(chunks, person_namespace)
        
        # 5. Also index the Contact Card into this namespace
        # This ensures the LLM knows WHO these files belong to when searching this namespace
        if person_info:
            index_person_to_vectorstore(
                user_id=user_id,
                person=person_info,
                source="System - Context Anchor",
                namespace=person_namespace
            )
        
        # 6. Link files to person (but NOT to global file registry)
        # Person-specific files should remain separate from general knowledge base files
        for filename in filenames:
            PersonsRegistry.add_file_to_person(user_id, person_id, filename) # Link to person

        return {
            "message": f"Successfully indexed {len(files)} files for {person_info.get('first_name', 'Contact')}",
            "doc_count": len(docs),
            "chunk_count": len(chunks)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

@router.delete("/{person_id}/files/{filename}")
async def delete_person_file(
    person_id: str,
    filename: str,
    user_id: str = Query(...)
):
    """Delete a file link from a person and remove from vector store"""
    try:
        from app.services.rag import delete_document
        
        # 1. Remove from person-specific vector store namespace
        person_namespace = f"{user_id}_person_{person_id}"
        delete_document(person_namespace, filename)
        
        # 2. Remove file association from person
        success = PersonsRegistry.remove_file_from_person(user_id, person_id, filename)
        if not success:
            raise HTTPException(status_code=404, detail="File association not found")
        
        # 3. Also remove from global file registry 
        # (Person-specific files shouldn't remain in the general knowledge base)
        FileRegistry.remove_file(user_id, filename)
        
        return {"message": f"Successfully removed {filename} from contact"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enrich-from-vcf")
async def enrich_from_vcf(
    files: List[UploadFile] = File(...),
    user_id: str = Form(...)
):
    """
    Process VCF uploads:
    1. Parse VCFs
    2. Check for matches against DB
    3. Return report for frontend confirmation
    """
    # Create temp dir for session
    temp_dir = f"temp_data/{user_id}/vcf_session_{uuid.uuid4()}"
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        saved_paths = []
        for file in files:
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            saved_paths.append(file_path)
            
        vcf_contacts = parse_vcf_files(saved_paths)
        if not vcf_contacts:
            # Clean up immediately if invalid
            shutil.rmtree(temp_dir)
            raise HTTPException(status_code=400, detail="No valid contacts found in VCF")
            
        existing_contacts = PersonsRegistry.get_persons(user_id)
        
        results = []
        stats = {"exact": 0, "partial": 0, "none": 0}
        
        for i, vcf in enumerate(vcf_contacts):
            match = match_vcf_to_contact(vcf, existing_contacts)
            m_type = match['match_type']
            stats[m_type] += 1
            
            res_entry = {
                'index': i,
                'vcf_name': vcf.get('full_name', 'Unknown'),
                'vcf_email': vcf.get('email', ''),
                'vcf_phone': vcf.get('phone', ''),
                'match_type': m_type
            }
            
            if match['contact']:
                c = match['contact']
                res_entry['matched_contact_id'] = c['id']
                res_entry['matched_contact_name'] = f"{c.get('first_name','')} {c.get('last_name','')}".strip()
                res_entry['matched_contact_company'] = c.get('company', '')
            
            results.append(res_entry)
            
        return {
            "all_contacts": results,
            "temp_dir": temp_dir, # Frontend MUST send this back for confirmation
            "exact_matches": stats["exact"],
            "partial_matches": stats["partial"],
            "no_matches": stats["none"],
            "total_vcf": len(vcf_contacts)
        }
    except Exception as e:
        if os.path.exists(temp_dir): shutil.rmtree(temp_dir)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/confirm-vcf-enrichment")
async def confirm_vcf_enrichment(
    user_id: str = Form(...),
    temp_dir: str = Form(...),
    contact_actions: str = Form("{}"),  # JSON string: {"0": "merge", "1": "create", "2": "skip"}
    overwrite: str = Form("false")  # Whether to overwrite existing data when merging
):
    """Apply the actions decided by the user - OPTIMIZED with batch processing"""
    try:
        if not os.path.exists(temp_dir): 
            raise HTTPException(status_code=400, detail="Session expired. Please upload VCF again.")
        
        actions = json.loads(contact_actions)
        overwrite_bool = overwrite.lower() == "true"
        
        # Reload VCFs from the temp session
        vcf_files = [os.path.join(temp_dir, f) for f in os.listdir(temp_dir) if f.endswith('.vcf')]
        vcf_contacts = parse_vcf_files(vcf_files)
        
        existing_contacts = PersonsRegistry.get_persons(user_id)
        
        # PHASE 1: Collect all operations
        merges = []  # List of (target_id, updated_data)
        creates = []  # List of new_person dicts
        
        for i, vcf in enumerate(vcf_contacts):
            action = actions.get(str(i), 'skip')
            
            if action == 'skip': 
                continue
            
            match = match_vcf_to_contact(vcf, existing_contacts)
            
            if action == 'merge' and match['contact']:
                # Collect merge operation
                target_id = match['contact']['id']
                updated_data = enrich_contact(match['contact'], vcf, overwrite_bool)
                merges.append((target_id, updated_data))
                
            elif action == 'create':
                # Collect create operation
                parts = vcf['full_name'].split(maxsplit=1)
                first = parts[0]
                last = parts[1] if len(parts) > 1 else ''
                
                new_person = {
                    'first_name': first,
                    'last_name': last,
                    'email': vcf.get('email'),
                    'phone': vcf.get('phone'),
                    'address': vcf.get('address'),
                    'birthday': vcf.get('birthday'),
                    'notes': vcf.get('notes')
                }
                creates.append(new_person)
        
        # PHASE 2: Batch process merges
        enriched = 0
        merge_persons = []
        for target_id, updated_data in merges:
            PersonsRegistry.update_person(user_id, target_id, updated_data)
            merge_persons.append(updated_data)
            enriched += 1
        
        # PHASE 3: Batch process creates
        created = 0
        created_persons = []
        if creates:
            # Batch insert all new contacts at once
            created_list = PersonsRegistry.add_persons(user_id, creates)
            created_persons.extend(created_list)
            created = len(created_list)
        
        # PHASE 4: Batch index ALL contacts to vector store
        print(f"🚀 Batch indexing {len(merge_persons) + len(created_persons)} contacts to vector store...")
        
        # Create contact card documents for all updated/created contacts
        from app.services.rag import create_contact_card_document, split_documents, setup_pinecone_vectorstore
        
        all_docs = []
        for person in merge_persons:
            doc = create_contact_card_document(person, "VCF Enrichment")
            all_docs.append(doc)
        
        for person in created_persons:
            doc = create_contact_card_document(person, "VCF Import")
            all_docs.append(doc)
        
        # Batch index all at once if we have any
        if all_docs:
            chunks = split_documents(all_docs)
            setup_pinecone_vectorstore(chunks, namespace=user_id)
            print(f"✅ Batch indexed {len(all_docs)} contacts in one operation")
        
        return {"message": "Processing complete", "enriched_count": enriched, "created_count": created}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Always clean up temp session
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)