from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Header
from typing import List, Optional
import os
import shutil
import uuid

# Import Services
from app.services.registry_service import FileRegistry, PersonsRegistry
from app.services.rag import (
    load_documents, 
    split_documents, 
    setup_pinecone_vectorstore,
    extract_contacts_from_xlsx, 
    extract_contacts_from_csv,
    create_contact_card_document,
    delete_document
)

router = APIRouter()

@router.post("/process")
async def process_documents(
    files: List[UploadFile] = File(...),
    user_id: str = Form(...), # This receives the user's email
    x_gemini_api_key: Optional[str] = Header(None),
    x_groq_api_key: Optional[str] = Header(None),
    x_nvidia_api_key: Optional[str] = Header(None),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Process uploaded files:
    1. Save to temp
    2. Extract and Index Contacts (CSV/XLSX) to DB + Pinecone
    3. Index Documents to Pinecone
    4. Update File Registry
    """
    if not files:
        return {"message": "No files received"}

    # 1. Filter duplicates
    existing_files = FileRegistry.get_files(user_id)
    new_files = [f for f in files if f.filename not in existing_files]
    
    if not new_files:
        return {"message": "All files already processed", "count": 0}

    # 2. Update Registry
    FileRegistry.add_files(user_id, [f.filename for f in new_files])

    # 3. Process & Ingest
    try:
        temp_dir = f"temp_data/{user_id}/{uuid.uuid4()}"
        os.makedirs(temp_dir, exist_ok=True)
        
        saved_paths = []
        for file in new_files:
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
            saved_paths.append(file_path)
        
        print(f"🔍 Processing {len(saved_paths)} files for user: {user_id}")
        
        # --- A. Extract Contacts (XLSX / CSV) ---
        contacts_extracted = 0
        contact_files = []  # Track files that had contacts extracted
        
        for file_path in saved_paths:
            ext = os.path.splitext(file_path)[1].lower()
            extracted_contacts = []
            
            if ext in ['.xlsx', '.xls']:
                print(f"📊 Extracting contacts from Excel: {file_path}")
                extracted_contacts = extract_contacts_from_xlsx(file_path)
            elif ext == '.csv':
                print(f"📊 Extracting contacts from CSV: {file_path}")
                extracted_contacts = extract_contacts_from_csv(file_path)
            
            if extracted_contacts:
                # Mark this file as a contact file
                contact_files.append(file_path)
                
                # 1. Add to Database and GET BACK the objects with IDs
                print(f"💾 Saving {len(extracted_contacts)} contacts to DB...")
                saved_persons = PersonsRegistry.add_persons(user_id, extracted_contacts)
                
                # 2. BATCH Index to Pinecone (OPTIMIZED!)
                print(f"🧠 Batch indexing {len(saved_persons)} contacts to Pinecone...")
                
                # Create all contact card documents at once
                contact_docs = []
                for person in saved_persons:
                    contact_doc = create_contact_card_document(
                        person=person,
                        source=f"Imported from {os.path.basename(file_path)}"
                    )
                    contact_docs.append(contact_doc)
                
                # Split and index all contacts in ONE batch operation
                if contact_docs:
                    chunks = split_documents(contact_docs)
                    setup_pinecone_vectorstore(chunks, namespace=user_id)
                    print(f"✅ Batch indexed {len(saved_persons)} contacts in one operation")
                
                contacts_extracted += len(saved_persons)

        # --- B. Standard RAG Ingestion (Docs, PDFs, etc.) ---
        # Only process files that weren't contact files
        non_contact_files = [f for f in saved_paths if f not in contact_files]
        
        if non_contact_files:
            # ✅ Passed the user's gemini key for OCR support
            documents = load_documents(non_contact_files, gemini_key=x_gemini_api_key)
            if documents:
                chunks = split_documents(documents)
                setup_pinecone_vectorstore(chunks, namespace=user_id)
        
        # Cleanup
        shutil.rmtree(temp_dir)
        
        return {
            "message": f"Processed {len(new_files)} files.",
            "contacts_added": contacts_extracted,
            "files": new_files[0].filename if len(new_files) == 1 else f"{len(new_files)} files"
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files")
def list_files(user_id: str = "default_user"):
    return {"files": FileRegistry.get_files(user_id)}

@router.delete("/files")
async def delete_file(user_id: str, filename: str):
    """Delete a file from the registry and Pinecone"""
    # Remove from Pinecone
    delete_document(user_id, filename)
    
    # Remove from DB
    success = FileRegistry.remove_file(user_id, filename)
    if success:
        return {"message": "File deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="File not found")