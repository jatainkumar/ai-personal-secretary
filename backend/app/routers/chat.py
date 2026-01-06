from fastapi import APIRouter, Depends, HTTPException, Body, Header
from typing import List, Dict, Optional
from pydantic import BaseModel
from datetime import datetime
import asyncio
import os
import re
import json

# --- Imports for AI Providers ---
from langchain_google_genai import ChatGoogleGenerativeAI
from google.api_core.exceptions import ResourceExhausted, InvalidArgument, Unauthenticated, GoogleAPIError

# App Imports
from app.services.registry_service import ChatHistory
from app.services.agent_router import get_router
from app.services.calendar_service import get_user_calendar_service, create_calendar_event
from app.routers.auth import get_current_user
from app.models.database import User, get_db, Person
from app.core.config import GOOGLE_API_KEY, GROQ_API_KEY
from app.services.rag import query_rag
from sqlalchemy.orm import Session

# Conditional imports for optional AI providers
try:
    from langchain_groq import ChatGroq
    GROQ_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  langchain_groq not available: {e}")
    ChatGroq = None
    GROQ_AVAILABLE = False

try:
    from langchain_nvidia_ai_endpoints import ChatNVIDIA
    NVIDIA_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  langchain_nvidia_ai_endpoints not available: {e}")
    ChatNVIDIA = None
    NVIDIA_AVAILABLE = False

router = APIRouter()

# --- Configuration ---
DEFAULT_MODEL = "gemini-fast"

# --- Pydantic Models ---
class ChatRequest(BaseModel):
    user_id: str
    query: str
    model_name: Optional[str] = DEFAULT_MODEL
    history: Optional[List[Dict[str, str]]] = []

class ChatResponse(BaseModel):
    answer: str
    intent: Optional[str] = None
    meeting_details: Optional[Dict] = None

class MeetingDetailsRequest(BaseModel):
    summary: str
    start_time: str
    end_time: str
    description: Optional[str] = ""
    contact_names: Optional[List[str]] = []
    attendees: Optional[List[str]] = []

# --- Helper: Error Processor ---
def process_llm_error(e: Exception, provider_name: str, is_user_key: bool) -> str:
    error_str = str(e).lower()
    
    # 1. Check for Authentication / Invalid Key Errors
    is_auth_error = (
        isinstance(e, (InvalidArgument, Unauthenticated)) or 
        "401" in error_str or 
        "400 invalid_argument" in error_str or
        "api_key_invalid" in error_str or
        "api key not valid" in error_str or
        "invalid api key" in error_str or
        "api key not found" in error_str
    )

    if is_auth_error:
        if is_user_key:
            return f"⚠️ **Invalid API Key.**\nThe {provider_name} API key you set in your Settings is invalid. Please check the key and try again."
        else:
            return "⚠️ **System Error.**\nThe system's shared API key is invalid or missing. Please contact the administrator or set your own key in Settings."

    # 2. Check for Quota / Rate Limit Errors
    is_quota_error = (
        isinstance(e, ResourceExhausted) or 
        "429" in error_str or 
        "quota" in error_str or 
        "rate limit" in error_str or
        "resource exhausted" in error_str
    )

    if is_quota_error:
        if is_user_key:
            return f"⚠️ **Quota Exceeded.**\nYour personal {provider_name} API key has exceeded its rate limits. Please check your provider's dashboard."
        else:
            return "⚠️ **System Busy.**\nThe shared Administrator API key is currently exhausted. Please **set your own API Key** in Settings > API Keys to continue without interruption."

    # 3. Generic Fallback
    return f"I encountered an error with the {provider_name} service: {str(e)[:100]}..."

# --- Helper: Model Factory ---
def get_llm(
    model_name: str = DEFAULT_MODEL,
    gemini_key: Optional[str] = None,
    groq_key: Optional[str] = None,
    nvidia_key: Optional[str] = None
):
    def resolve_key(user_key, env_var):
        if user_key and user_key.strip():
            return user_key
        return os.getenv(env_var)

    if model_name.startswith("llama3"):
        target_key = resolve_key(groq_key, "GROQ_API_KEY")
        if not GROQ_AVAILABLE or ChatGroq is None:
            return get_llm("gemini-fast", gemini_key, groq_key, nvidia_key)
        model_id = "llama-3.1-8b-instant" if model_name == "llama3-fast" else "llama-3.3-70b-versatile"
        return ChatGroq(model=model_id, temperature=0, api_key=target_key)

    elif model_name == "nvidia-smart":
        target_key = resolve_key(nvidia_key, "NVIDIA_API_KEY")
        if not NVIDIA_AVAILABLE or ChatNVIDIA is None:
            return get_llm("gemini-pro", gemini_key, groq_key, nvidia_key)
        return ChatNVIDIA(model="meta/llama-3.3-70b-instruct", temperature=0.1, api_key=target_key)

    gemini_model = "gemini-2.5-pro" if model_name == "gemini-pro" else "gemini-2.5-flash"
    target_key = resolve_key(gemini_key, "GOOGLE_API_KEY")
    if not target_key: return None
        
    return ChatGoogleGenerativeAI(
        model=gemini_model, temperature=0.1, convert_system_message_to_human=True, google_api_key=target_key
    )

# --- Prompts ---
def build_meeting_extraction_prompt(query: str, current_time: datetime) -> str:
    return f"""You are a meeting scheduling assistant. 
    User Request: "{query}"
    Current Date/Time: {current_time.strftime('%Y-%m-%d %H:%M:%S')} IST
    Extract the details and return a VALID JSON OBJECT.
    JSON Fields:
    - summary: Title (string)
    - start_time: ISO 8601 (YYYY-MM-DDTHH:MM:SS) in IST
    - end_time: ISO 8601 (YYYY-MM-DDTHH:MM:SS) in IST
    - description: Purpose (string)
    - contact_names: List of names (e.g. ["John Doe"])
    - attendees: List of emails (e.g. ["john@email.com"])
    Rules:
    - Today's date is {current_time.strftime('%Y-%m-%d')}
    - Default duration: 1 hour
    - If info is missing, imply "today" or leave empty.
    OUTPUT ONLY THE JSON OBJECT. NO TEXT BEFORE OR AFTER.
    """

def extract_json(text: str):
    try:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            json_str = match.group(0)
            return json.loads(json_str)
        return json.loads(text)
    except Exception as e:
        print(f"❌ JSON Extraction Failed: {e}")
        return None

# --- CHAT ENDPOINT ---

@router.post("/chat")
async def chat_endpoint(
    request: ChatRequest, 
    x_gemini_api_key: Optional[str] = Header(None),
    x_groq_api_key: Optional[str] = Header(None),
    x_nvidia_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    user_id = request.user_id
    query = request.query
    model_name = request.model_name or DEFAULT_MODEL
    
    # 1. AUTO-LOAD HISTORY if not provided
    history = request.history
    if not history:
        full_history = ChatHistory.get_history(user_id)
        history = full_history[-15:] if full_history else []
    
    ChatHistory.save_message(user_id, "user", query)
    
    current_provider = "Google Gemini"
    is_user_key = False
    if model_name.startswith("llama3"):
        current_provider = "Groq"
        if x_groq_api_key and x_groq_api_key.strip(): is_user_key = True
    elif model_name == "nvidia-smart":
        current_provider = "NVIDIA"
        if x_nvidia_api_key and x_nvidia_api_key.strip(): is_user_key = True
    else:
        if x_gemini_api_key and x_gemini_api_key.strip(): is_user_key = True

    try:
        intent = None
        
        # 2. HEURISTIC OVERRIDE (Fixing your "With whom?" issue)
        # If the LAST message was a meeting confirmation, force the next intent to be 'general_chat'
        # so it uses history instead of routing to RAG.
        if history:
            last_msg = history[-1]
            # Check if last msg was assistant and mentioned a meeting was scheduled
            if (last_msg.get('role') == 'assistant' and 
                "Meeting Scheduled" in last_msg.get('content', '')):
                print("🧠 Context Override: Detected follow-up to meeting -> Forcing general_chat")
                intent = "general_chat"

        # 3. Determine Intent (if not overridden)
        if not intent:
            try:
                router_agent = get_router() 
                
                intent = await router_agent.aroute(query, x_gemini_api_key, x_groq_api_key, x_nvidia_api_key)
                print(f"🧠 Detected Intent: {intent}")
            except Exception as e:
                print(f"⚠️ Router Error: {e}")
                intent = "general_chat"
        
        answer = ""
        response_data = {"intent": intent}

        if intent == "schedule_meeting":
             result = await handle_schedule_meeting(
                 user_id, query, db, model_name,
                 gemini_key=x_gemini_api_key,
                 groq_key=x_groq_api_key,
                 nvidia_key=x_nvidia_api_key
             )
             answer = result["answer"]
             if "meeting_details" in result:
                 response_data["meeting_details"] = result["meeting_details"]

        elif intent == "general_chat":
             answer = await handle_general_chat(
                 query, model_name, history,
                 gemini_key=x_gemini_api_key,
                 groq_key=x_groq_api_key,
                 nvidia_key=x_nvidia_api_key
             )

        else:
             print(f"📚 Routing to RAG engine (Model: {model_name})...")
             loop = asyncio.get_event_loop()
             # We wrap RAG in try/except here too, so if RAG fails, we fall back to chat
             try:
                 answer = await loop.run_in_executor(
                     None, 
                     lambda: query_rag(
                         user_id=user_id, 
                         query=query, 
                         model_option=model_name,
                         gemini_key=x_gemini_api_key,
                         groq_key=x_groq_api_key,
                         nvidia_key=x_nvidia_api_key
                     )
                 )
             except Exception as rag_err:
                 print(f"⚠️ RAG Failed: {rag_err}. Falling back to General Chat.")
                 # Fallback: If RAG crashes (quota/error), try general chat with history
                 answer = await handle_general_chat(
                     query, model_name, history,
                     gemini_key=x_gemini_api_key,
                     groq_key=x_groq_api_key,
                     nvidia_key=x_nvidia_api_key
                 )
             
        ChatHistory.save_message(user_id, "assistant", answer)
        response_data["answer"] = answer
        return ChatResponse(**response_data)

    except Exception as e:
        print(f"❌ Chat Exception: {type(e).__name__} - {str(e)}")
        error_msg = process_llm_error(e, current_provider, is_user_key)
        ChatHistory.save_message(user_id, "assistant", error_msg)
        return ChatResponse(answer=error_msg, intent="error")

# --- HANDLERS ---
async def handle_general_chat(
    query: str, 
    model_name: str,
    history: List[Dict[str, str]],
    gemini_key: str = None,
    groq_key: str = None,
    nvidia_key: str = None
) -> str:
    llm = get_llm(model_name, gemini_key, groq_key, nvidia_key)
    if not llm: raise ValueError("LLM could not be initialized. No valid API key found.")
    
    system_prompt = """You are a specialized AI Career Secretary connected to the user's personal data.
    Your Capabilities:
    1. 📅 Schedule Meetings
    2. 🔍 Search Personal Files (RAG)
    3. 📇 Contact Lookup
    Be concise, professional, and helpful. 
    If the user refers to previous context (e.g., "who is he", "what time was that"), use the chat history to understand.
    """
    
    messages = [("system", system_prompt)]
    recent_history = history[-10:] if history else []
    for turn in recent_history:
        role = "human" if turn.get('role') == 'user' else "assistant"
        content = turn.get('content', '')
        if content:
            messages.append((role, content))
    messages.append(("human", query))
    
    response = await llm.ainvoke(messages)
    return response.content
    
async def handle_schedule_meeting(
    user_id: str, 
    query: str, 
    db: Session, 
    model_name: str,
    gemini_key: str = None,
    groq_key: str = None,
    nvidia_key: str = None
):
    llm = get_llm(model_name, gemini_key, groq_key, nvidia_key)
    if not llm: raise ValueError("LLM could not be initialized. No valid API key found.")
    
    import pytz
    IST = pytz.timezone("Asia/Kolkata")
    current_time = datetime.now(IST)
    
    prompt = build_meeting_extraction_prompt(query, current_time)
    extraction_response = await llm.ainvoke(prompt)
    meeting_data = extract_json(extraction_response.content)
    
    if not meeting_data:
        return {"answer": "I understood you want to schedule a meeting, but I couldn't get the details. Could you please specify the time and title again?", "intent": "error"}

    try:
        details = MeetingDetailsRequest(**meeting_data)
        
        found_contacts = []
        if details.contact_names:
            for name in details.contact_names:
                name_parts = name.split()
                if not name_parts: continue
                search_term = f"%{name}%"
                person = db.query(Person).filter(
                    (Person.user_email == user_id) & 
                    (
                        (Person.first_name + " " + Person.last_name).ilike(search_term) |
                        (Person.first_name.ilike(search_term)) |
                        (Person.last_name.ilike(search_term))
                    )
                ).first()
                if person:
                    found_contacts.append(person)
                    if person.email and person.email not in details.attendees:
                        details.attendees.append(person.email)
        
        context_msg = ""
        if found_contacts:
            contact_info = [f"{p.first_name} {p.last_name} ({p.company or 'Unknown'})" for p in found_contacts]
            context_msg = "\n\nParticipants:\n" + "\n".join(contact_info)
        if context_msg: details.description = (details.description or "") + context_msg

        user_obj = db.query(User).filter(User.email == user_id).first()
        if not user_obj: return {"answer": "User not found in database. Please log in again.", "intent": "error"}

        service = get_user_calendar_service(db, user_obj.id)
        event = create_calendar_event(service, details)

        meet_link = ""
        conference_data = event.get("conferenceData", {})
        for entry in conference_data.get("entryPoints", []):
            if entry.get("entryPointType") == "video":
                meet_link = entry.get("uri")
                break
        
        success_message = f"✅ **Meeting Scheduled!**\n\n**Title:** {details.summary}\n\n**Time:** {details.start_time}\n"
        if meet_link: success_message += f"\n[Join Google Meet]({meet_link})"
        else: success_message += f"\n[View on Calendar]({event.get('htmlLink')})"

        return {
            "answer": success_message,
            "intent": "schedule_meeting_done",
            "meeting_details": details.dict()
        }

    except ValueError as ve:
         return {"answer": f"⚠️ I couldn't access your calendar. Please make sure you have authenticated with Google Calendar. ({str(ve)})", "intent": "error"}
    except Exception as e:
        print(f"❌ Error in scheduling logic: {str(e)}")
        return {"answer": f"I extracted the details, but failed to save to Calendar: {str(e)}", "intent": "error"}

@router.get("/history")
def get_chat_history_endpoint(user_id: str = "default_user"):
    return {"history": ChatHistory.get_history(user_id)}

@router.delete("/history")
def delete_history_endpoint(user_id: str = "default_user"):
    ChatHistory.clear_history(user_id)
    return {"message": "History cleared"}