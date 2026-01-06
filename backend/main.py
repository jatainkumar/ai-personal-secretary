import os
import pytz
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.models.database import init_db
from app.models.database import init_db
# Import routers
from app.routers import auth, chat, files, contacts, voice

load_dotenv()

# Initialize database tables
try:
    init_db()
    print("✅ Database initialized successfully")
except Exception as e:
    print(f"⚠️  Warning: Database initialization failed: {e}")

app = FastAPI(title="AI Personal Secretary API")

# Configure timezone
IST = pytz.timezone("Asia/Kolkata")

# Setup CORS
# Get allowed origins from environment or use wildcard for development
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = allowed_origins_str.split(",") if allowed_origins_str != "*" else ["*"]

if allowed_origins == ["*"]:
    print("⚠️  WARNING: CORS is allowing all origins. Set ALLOWED_ORIGINS in production!")
else:
    print(f"✅ CORS configured with allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Team Leo AI (Persistent) is Ready"}

# Include Routers
# Auth: /auth/google/login, etc.
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Chat: /chat, /schedule, /history
app.include_router(chat.router, tags=["Chat"])

# Files: /process, /files
app.include_router(files.router, tags=["Files"])

# Contacts: /persons, /persons/{id}, /persons/enrich...
app.include_router(contacts.router, prefix="/persons", tags=["Contacts"])

# Voice: /voice/upload
app.include_router(voice.router, prefix="/voice", tags=["Voice"])