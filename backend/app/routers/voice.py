from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Header
from fastapi.responses import JSONResponse
import os
import shutil
import uuid
import datetime
from typing import Optional
from elevenlabs import ElevenLabs
from dotenv import load_dotenv

from app.services.registry_service import FileRegistry
from app.core.config import PINECONE_INDEX_NAME
# Import utilities
from langchain_core.documents import Document
from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings

load_dotenv()

router = APIRouter()

@router.post("/upload")
async def upload_voice_note(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    # Get user's key from the frontend headers
    x_elevenlabs_api_key: Optional[str] = Header(None) 
):
    """
    1. Receives audio file
    2. Transcribes using ElevenLabs (User key prioritized)
    3. Register "virtual file" in FileRegistry
    4. Stores context in Pinecone (with failsafe for 404 errors)
    """
    
    # Priority: 1. User Header Key -> 2. Environment Key
    api_key = x_elevenlabs_api_key or os.getenv("ELEVENLABS_API_KEY")
    
    if not api_key:
        raise HTTPException(status_code=500, detail="ElevenLabs API Key missing")

    temp_filename = f"temp_{uuid.uuid4()}.{file.filename.split('.')[-1]}"
    
    try:
        # 1. Temporarily save file
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        print(f"🎙️ Transcribing with ElevenLabs (using {'user' if x_elevenlabs_api_key else 'system'} key)...")
            
        # 2. Transcribe
        client = ElevenLabs(api_key=api_key)
        
        with open(temp_filename, "rb") as audio_file:
             transcription = client.speech_to_text.convert(
                file=audio_file,
                model_id="scribe_v1"
            )
            
        text = transcription.text
        print(f"✅ Transcription: {text[:50]}...")
        
        # 3. Clean up temp file immediately after transcription
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        
        if not text:
             return JSONResponse(content={"message": "No speech detected"}, status_code=200)

        # 4. Generate Virtual Filename
        timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        virtual_filename = f"Voice_Note_{timestamp_str}.txt"

        # 5. Update Registry
        FileRegistry.add_files(user_id, [virtual_filename])

        # 6. Store in Pinecone with ERROR HANDLING for 404s
        try:
            doc = Document(
                page_content=f"--- VOICE NOTE ({timestamp_str}) ---\n{text}",
                metadata={
                    "source": virtual_filename, 
                    "user_id": user_id,
                    "type": "voice_transcript",
                    "timestamp": timestamp_str
                }
            )
            
            pinecone_key = os.getenv("PINECONE_API_KEY")
            index_name = PINECONE_INDEX_NAME or "ai-secretary"
            
            embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")
            
            vectorstore = PineconeVectorStore(
                index_name=index_name,
                embedding=embeddings,
                pinecone_api_key=pinecone_key,
                namespace=user_id
            )
            
            vectorstore.add_documents([doc])
            print(f"💾 Successfully indexed to Pinecone: {virtual_filename}")
            
        except Exception as pine_err:
            # We log the error but DON'T raise an exception so the user still gets their text
            print(f"⚠️ Pinecone indexing failed (likely index 404): {pine_err}")

        return JSONResponse(content={
            "message": "Voice note processed successfully", 
            "transcription": text,
            "filename": virtual_filename
        }, status_code=200)

    except Exception as e:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
            
        print(f"❌ Error in voice processing: {e}")
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {str(e)}")