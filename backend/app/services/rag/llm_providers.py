"""
Multi-provider LLM factory for RAG queries.
Supports Gemini (primary), with optional Groq and NVIDIA providers.
"""

import os
from typing import Optional
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.language_models import BaseChatModel

# Try to import optional providers
try:
    from langchain_groq import ChatGroq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("⚠️  langchain_groq not available (version conflict) - Groq models disabled")

try:
    from langchain_nvidia_ai_endpoints import ChatNVIDIA
    NVIDIA_AVAILABLE = True
except ImportError:
    NVIDIA_AVAILABLE = False
    print("⚠️ langchain_nvidia_ai_endpoints not available - NVIDIA models disabled")

load_dotenv()

#

def get_chat_model(
    model_option: str = "gemini-fast",
    gemini_key: Optional[str] = None,
    groq_key: Optional[str] = None,
    nvidia_key: Optional[str] = None
) -> BaseChatModel:
    
    # Helper to resolve key (User provided > Env var)
    def resolve_key(user_key, env_var):
        if user_key and user_key.strip():
            return user_key
        return os.getenv(env_var)

    # --- GOOGLE GEMINI ---
    if model_option == "gemini-fast":
        return ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0,
            google_api_key=resolve_key(gemini_key, "GOOGLE_API_KEY"),
            convert_system_message_to_human=True
        )
    elif model_option == "gemini-pro":
        return ChatGoogleGenerativeAI(
            model="gemini-2.5-pro",
            temperature=0,
            google_api_key=resolve_key(gemini_key, "GOOGLE_API_KEY"),
            convert_system_message_to_human=True
        )

    # --- GROQ ---
    elif model_option.startswith("llama3"):
        # Allow if key is provided OR env var exists (even if GROQ_AVAILABLE is False locally, 
        # we assume the package is installed if the user is trying to use it)
        target_key = resolve_key(groq_key, "GROQ_API_KEY")
        if not target_key:
             return get_chat_model("gemini-fast", gemini_key, groq_key, nvidia_key)

        model_name = "llama-3.1-8b-instant" if model_option == "llama3-fast" else "llama-3.3-70b-versatile"
        return ChatGroq(
            model=model_name,
            temperature=0,
            api_key=target_key
        )
    
    # --- NVIDIA ---
    elif model_option == "nvidia-smart":
        target_key = resolve_key(nvidia_key, "NVIDIA_API_KEY")
        if not target_key:
            return get_chat_model("gemini-pro", gemini_key, groq_key, nvidia_key)
            
        return ChatNVIDIA(
            model="meta/llama-3.3-70b-instruct", 
            temperature=0, 
            api_key=target_key
        )
    
    else:
        print(f"Warning: Unknown model '{model_option}', falling back to Gemini Flash.")
        return ChatGoogleGenerativeAI(
            
            model="gemini-2.5-flash", 
            google_api_key=resolve_key(gemini_key, "GOOGLE_API_KEY"),
            convert_system_message_to_human=True
        )
