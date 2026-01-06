from typing import Optional, Literal
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
import json
import os

# Try to import ChatGroq and ChatNVIDIA
try:
    from langchain_groq import ChatGroq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    ChatGroq = None

try:
    from langchain_nvidia_ai_endpoints import ChatNVIDIA
    NVIDIA_AVAILABLE = True
except ImportError:
    NVIDIA_AVAILABLE = False
    ChatNVIDIA = None

# --- Tool Selection Schema ---
class ToolSelection(BaseModel):
    tool: Literal["schedule_meeting", "query_data", "general_chat"] = Field(
        description="The tool to use for this query"
    )
    reasoning: str = Field(
        description="Brief explanation of why this tool was chosen"
    )

ROUTER_SYSTEM_PROMPT = """You are an intelligent routing assistant. Analyze the query and select the appropriate tool.
Available tools:
1. **schedule_meeting** - Schedule, book, or create meetings.
2. **query_data** - Ask questions about uploaded files/personal data.
3. **general_chat** - General knowledge, greetings, or conversation.
RESPONSE FORMAT: Return ONLY a JSON object with keys 'tool' and 'reasoning'."""

class AgentRouter:
    def __init__(self):
        """Initialize System LLMs from Environment"""
        google_key = os.getenv("GOOGLE_API_KEY")
        self.system_primary = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash", google_api_key=google_key, temperature=0.0
        ) if google_key else None

        groq_key = os.getenv("GROQ_API_KEY")
        self.system_backup = ChatGroq(
            model="llama-3.1-8b-instant", api_key=groq_key, temperature=0.0
        ) if (GROQ_AVAILABLE and groq_key) else None

    async def _invoke_llm(self, llm, messages, provider_name):
        result = await llm.ainvoke(messages)
        content = result.content.strip().replace("```json", "").replace("```", "")
        try:
            parsed = json.loads(content)
            tool = parsed.get("tool", "general_chat")
            print(f"✅ [ROUTER-{provider_name}] Tool: {tool}")
            return tool
        except:
            return "general_chat"

    async def aroute(
        self, 
        query: str, 
        x_gemini_api_key: Optional[str] = None, 
        x_groq_api_key: Optional[str] = None, 
        x_nvidia_api_key: Optional[str] = None
    ) -> str:
        messages = [SystemMessage(content=ROUTER_SYSTEM_PROMPT), HumanMessage(content=query)]

        # 1. Try User NVIDIA First (Matches your intent for the NVIDIA key)
        if x_nvidia_api_key and x_nvidia_api_key.strip() and NVIDIA_AVAILABLE:
            try:
                llm = ChatNVIDIA(model="meta/llama-3.1-8b-instruct", nvidia_api_key=x_nvidia_api_key, temperature=0.0)
                return await self._invoke_llm(llm, messages, "USER-NVIDIA")
            except Exception as e:
                print(f"⚠️ User NVIDIA Key failed: {e}")

        # 2. Try User Gemini
        if x_gemini_api_key and x_gemini_api_key.strip():
            try:
                llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=x_gemini_api_key, temperature=0.0)
                return await self._invoke_llm(llm, messages, "USER-GEMINI")
            except Exception as e:
                print(f"⚠️ User Gemini Key failed: {e}")

        # 3. Try System Gemini (Your existing primary)
        if self.system_primary:
            try:
                return await self._invoke_llm(self.system_primary, messages, "SYSTEM-GEMINI")
            except: pass

        # 4. Try System Groq (Your existing backup)
        if self.system_backup:
            try:
                return await self._invoke_llm(self.system_backup, messages, "SYSTEM-GROQ")
            except: pass

        return "general_chat"

_router_instance: Optional[AgentRouter] = None
def get_router() -> AgentRouter:
    global _router_instance
    if _router_instance is None: _router_instance = AgentRouter()
    return _router_instance