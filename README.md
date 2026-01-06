# AI Personal Secretary 🤖

> **An intelligent personal assistant powered by RAG (Retrieval Augmented Generation) and Google's Gemini AI** 

Seamlessly manage contacts, documents, and schedules with intelligent context-aware AI assistance across web and mobile platforms.

---

## ✨ Features at a Glance

### 🎯 Core Capabilities

| Feature | Description | Technologies |
|---------|-------------|--------------|
| **📇 Smart Contact Management** | Import from LinkedIn CSV/XLSX, VCF files with 3-tier intelligent matching (exact/partial/no match) | SQLAlchemy ORM, Pinecone namespaces |
| **📄 Universal Document Intelligence** | Process ANY file type (PDF, DOCX, XLSX, images, code, etc.) with RAG-powered search | LangChain, Unstructured, PyMuPDF |
| **👤 Person-Specific Context** | Upload files linked to specific contacts with namespace isolation | Pinecone multi-namespace architecture |
| **💬 Intelligent Chat Assistant** | Context-aware conversations with abort control and streaming responses | Google Gemini 2.5 Flash, Agent Router |
| **🎙️ Voice Recording & Upload** | Upload voice recordings for AI processing and transcription | ElevenLabs API, Voice router |
| **📅 Meeting Scheduler** | AI-powered meeting scheduling with Google Calendar integration | Google Calendar API, OAuth 2.0 |
| **🔍 Advanced Search & Filtering** | Real-time contact search across all fields (name, company, email, phone, URL) | Client-side fuzzy matching |
| **🔄 Real-Time Sync** | All operations automatically sync with vector database | PostgreSQL/NeonDB + Pinecone |
| **📱 Cross-Platform** | Responsive web app + Native Flutter mobile app | React, Flutter, Riverpod |

---

## 🏗️ Architecture Overview

### System Design

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React Web App<br/>Port 5173]
        B[Flutter Mobile App<br/>Android/iOS]
    end
    
    subgraph "Backend Layer"
        C[FastAPI Server<br/>Port 8000]
        D[Modular Routers<br/>Auth, Chat, Files, Contacts, Voice]
        E[Service Layer<br/>RAG, Agent, Calendar, Storage]
    end
    
    subgraph "Data & AI Layer"
        F[PostgreSQL/NeonDB<br/>User, Person, Files]
        G[Pinecone Vector DB<br/>Multi-namespace RAG]
        H[Google Gemini 2.5 Flash<br/>AI Generation]
        I[HuggingFace Embeddings<br/>Sentence Transformers]
        J[Google Calendar API<br/>Meeting Scheduling]
    end
    
    A --> C
    B --> C
    C --> D
    D --> E
    E --> F
    E --> G
    E --> H
    E --> I
    E --> J
    
    style A fill:#8b5cf6,color:#fff
    style B fill:#8b5cf6,color:#fff
    style C fill:#ec4899,color:#fff
    style G fill:#10b981,color:#fff
    style H fill:#f59e0b,color:#fff
```

### Data Flow Pipeline

```
1. Upload → 2. Process → 3. Embed → 4. Index → 5. Query → 6. Generate

📤 User uploads file (PDF/DOCX/XLSX/Image/etc.)
⚙️ LangChain splits into semantic chunks (RecursiveCharacterTextSplitter)
🧠 HuggingFace creates embeddings (sentence-transformers/all-MiniLM-L6-v2)
💾 Pinecone indexes with metadata (user_id, person_id, filename, source)
🔍 Multi-namespace search (main + all person namespaces, k=50+10)
✨ Gemini generates context-aware response with citations
```

---

## 📁 Project Structure

```
AI-Secretary-Unified/
├── 📂 backend/                         # Python FastAPI Backend
│   ├── 📄 main.py                      # Application entry point (49 lines)
│   ├── 📄 requirements.txt             # 82 Python dependencies
│   ├── 📄 .env.example                 # Environment variables template
│   ├── 📄 Dockerfile                   # Container configuration
│   │
│   ├── 📂 app/                         # Main application package
│   │   ├── 📂 routers/                 # API Route Handlers
│   │   │   ├── 📄 auth.py              # Google OAuth 2.0 (login/callback) - 4.5KB
│   │   │   ├── 📄 chat.py              # Chat & Meeting Logic - 13.5KB
│   │   │   ├── 📄 files.py             # File Operations (upload/delete) - 5.7KB
│   │   │   ├── 📄 contacts.py          # Contact CRUD + VCF enrichment - 22.5KB
│   │   │   └── 📄 voice.py             # Voice upload & processing - 4.8KB
│   │   │
│   │   ├── 📂 services/                # Business Logic Layer
│   │   │   ├── 📄 agent_router.py      # Intent classification (chat/query/action) - 4.7KB
│   │   │   ├── 📄 auth_service.py      # OAuth helpers & token mgmt - 5.9KB
│   │   │   ├── 📄 calendar_service.py  # Google Calendar integration - 3.8KB
│   │   │   ├── 📄 registry_service.py  # SQLite CRUD operations - 9.4KB
│   │   │   ├── 📄 storage_service.py   # File system operations - 3.4KB
│   │   │   └── 📂 rag/                 # RAG Engine (Modular)
│   │   │       ├── 📄 __init__.py      # Main RAG orchestrator - 1.8KB
│   │   │       ├── 📄 contact_indexing.py   # Person-to-vector sync - 11.3KB
│   │   │       ├── 📄 contact_parsers.py    # CSV/XLSX/VCF parsers - 15.1KB
│   │   │       ├── 📄 document_loaders.py   # Multi-format loaders - 10.3KB
│   │   │       ├── 📄 llm_providers.py      # LLM provider abstraction - 3.6KB
│   │   │       ├── 📄 query_engine.py       # Multi-namespace search - 21.9KB
│   │   │       └── 📄 vectorstore.py        # Pinecone wrapper - 2.3KB
│   │   │
│   │   ├── 📂 models/                  # Database Models
│   │   │   ├── 📄 database.py          # SQLAlchemy Models (User, Person, Files) - 6.7KB
│   │   │   └── 📄 schemas.py           # Pydantic validation schemas - 3.2KB
│   │   │
│   │   ├── 📂 core/                    # Core Configuration
│   │   └── 📂 utils/                   # Utility Functions
│   │
│   ├── 📂 data/                        # Persistent Storage
│   │   └── 📄 ai_secretary.db          # SQLite database file
│   └── 📂 temp_data/                   # Temporary file uploads
│
├── 📂 frontend/                        # React + TypeScript Frontend
│   ├── 📄 package.json                 # Node.js dependencies (41 lines)
│   ├── 📄 vite.config.js               # Vite build configuration
│   ├── 📄 tailwind.config.js           # Tailwind CSS theme (2.4KB)
│   ├── 📄 index.html                   # HTML template
│   │
│   ├── 📂 src/                         # Source Code
│   │   ├── 📄 App.tsx                  # Main application shell - 1.4KB
│   │   ├── 📄 main.jsx                 # React entry point - 464 bytes
│   │   ├── 📄 index.css                # Global styles (Tailwind) - 11KB
│   │   ├── 📄 firebase.js              # Firebase Analytics setup - 723 bytes
│   │   │
│   │   ├── 📂 pages/                   # Page Components
│   │   │   ├── 📄 Login.tsx            # Google OAuth login page - 2.8KB
│   │   │   └── 📄 Dashboard.tsx        # Main dashboard with tabs - 9.5KB
│   │   │
│   │   ├── 📂 components/              # Reusable UI Components
│   │   │   ├── 📄 Background3D.jsx     # Three.js animated background - 2.6KB
│   │   │   ├── 📄 ErrorBoundary.jsx    # React error boundary - 635 bytes
│   │   │   ├── 📂 chat/                # Chat-related components
│   │   │   │   └── ChatView.tsx        # Chat interface with message list
│   │   │   ├── 📂 contacts/            # Contact management components
│   │   │   │   └── ContactsView.tsx    # Contact grid with cards
│   │   │   ├── 📂 layout/              # Layout components
│   │   │   │   └── Sidebar.tsx         # Navigation sidebar
│   │   │   ├── 📂 modals/              # Modal dialogs
│   │   │   │   ├── EditContactModal.tsx
│   │   │   │   ├── DeleteConfirmModal.tsx
│   │   │   │   ├── VcfEnrichmentModal.tsx
│   │   │   │   └── UploadProgressModal.tsx
│   │   │   └── 📂 shared/              # Shared components
│   │   │       ├── Background3D.tsx    # Three.js animated background
│   │   │       ├── ErrorBoundary.tsx   # React error boundary
│   │   │       └── VoiceRecorder.tsx   # Voice recording component
│   │   │
│   │   ├── 📂 hooks/                   # Custom React Hooks
│   │   │   ├── 📄 useAuth.ts           # Authentication state
│   │   │   ├── 📄 useChat.ts           # Chat logic & abort control - 4KB
│   │   │   ├── 📄 useContacts.ts       # Contact CRUD operations - 6.2KB
│   │   │   ├── 📄 useFiles.ts          # File upload/delete - 4KB
│   │   │   ├── 📄 useVcf.ts            # VCF enrichment flow - 4.4KB
│   │   │   └── 📄 useCalendar.ts       # Meeting scheduling - 3KB
│   │   │
│   │   ├── 📂 context/                 # React Context
│   │   │   └── AuthContext.tsx         # Global auth state
│   │   │
│   │   ├── 📂 types/                   # TypeScript Definitions
│   │   │   └── index.ts                # Type definitions (Person, Message, etc.)
│   │   │
│   │   └── 📂 api/                     # API Client
│   │       └── client.ts               # Axios instance with interceptors
│   │
│   ├── 📂 public/                      # Static Assets
│   └── 📂 dist/                        # Production build output
│
├── 📂 flutter_client/                  # Flutter Mobile App
│   ├── 📄 pubspec.yaml                 # Flutter dependencies
│   ├── 📂 lib/                         # Dart source code
│   │   ├── 📄 main.dart                # App entry point
│   │   ├── 📂 screens/                 # UI screens
│   │   └── 📂 providers/               # Riverpod state management
│   └── 📂 android/                     # Android-specific config
│
├── 📄 .gitignore                       # Git exclusions (comprehensive)
├── 📄 firebase.json                    # Firebase Hosting + Functions config
├── 📄 .firebaserc                      # Firebase project settings
├── 📄 start_app.ps1                    # PowerShell startup script
├── 📄 Overview.md                      # Technical deep-dive (619 lines)
└── 📄 README.md                        # This file
```

---

## 🛠️ Technology Stack

### Backend Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | FastAPI | ≥0.103.0 | High-performance async web framework |
| **Server** | Uvicorn | ≥0.27.0 | ASGI server with hot reload |
| **Database** | PostgreSQL/NeonDB + SQLAlchemy | Latest | Cloud-native PostgreSQL with ORM |
| **Vector DB** | Pinecone | ≥3.2.2 | Scalable vector similarity search |
| **AI Model** | Google Gemini 2.5 Flash | Latest | Text generation & reasoning |
| **Embeddings** | Sentence Transformers | 2.6.1 | Local embedding generation (all-MiniLM-L6-v2) |
| **LangChain** | LangChain | 0.1.16 | Document processing orchestration |
| **Document Processing** | Unstructured | 0.10.0+ | Multi-format parsing (PDF, DOCX, XLSX, images) |
| **Google APIs** | google-api-python-client | Latest | Calendar integration & OAuth |
| **Authentication** | PyJWT + OAuth2 | Latest | Secure token-based auth |
| **Voice Processing** | ElevenLabs | ~2.27.0 | Voice transcription and processing |
| **File Parsing** | pypdf, python-docx, openpyxl, vobject, pymupdf | Latest | Specialized file format support |

### Frontend Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | React | ^19.2.0 | Component-based UI framework |
| **Language** | TypeScript | Latest | Type-safe JavaScript |
| **Build Tool** | Vite | ^7.2.4 | Lightning-fast HMR & bundling |
| **Styling** | Tailwind CSS | 3.4.17 | Utility-first CSS framework |
| **Animations** | Framer Motion | 12.23.25 | Smooth transitions & micro-interactions |
| **3D Graphics** | Three.js (@react-three/fiber) | 9.4.2 | WebGL background animations |
| **HTTP Client** | Axios | 1.13.2 | Promise-based API calls |
| **Icons** | Lucide React | 0.556.0 | Modern icon library |
| **Markdown** | react-markdown + remark-gfm | 10.1.0 | Render AI responses with GFM support |
| **Analytics** | Firebase Analytics | 12.7.0 | User behavior tracking |

### Mobile Technologies

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Flutter 3.10+ | Cross-platform mobile framework |
| **State Management** | Riverpod | Reactive state management |
| **UI Kit** | Material 3 | Google's design system |
| **Fonts** | Google Fonts (Inter) | Typography |
| **HTTP Client** | http package | API communication |

---

## 🚀 Setup Instructions

### Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: 16 or higher
- **Conda**: Recommended for Python environment management
- **Git**: For version control
- **API Keys**: 
  - Google Gemini API key ([Get here](https://makersuite.google.com/app/apikey))
  - Pinecone API key ([Get here](https://www.pinecone.io/))
  - Google Cloud Project (for OAuth & Calendar API)

### 1. Backend Setup

#### Step 1: Clone Repository
```bash
git clone https://github.com/yourusername/AI-Secretary-Unified.git
cd AI-Secretary-Unified/backend
```

#### Step 2: Create Conda Environment
```bash
conda create -n ai_secretary python=3.10
conda activate ai_secretary
```

#### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

#### Step 4: Configure Environment Variables
Create a `.env` file in `backend/` directory:

```bash
# Google Gemini AI
GOOGLE_API_KEY=your_gemini_api_key_here

# Pinecone Vector Database
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=ai-secretary

# PostgreSQL/NeonDB Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Google OAuth & Calendar API
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
REDIRECT_URI=http://localhost:5173/auth/callback

# Application Settings
JWT_SECRET_KEY=your_random_secret_key_for_jwt
CREDENTIAL_ENCRYPTION_KEY=your_encryption_key_here
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

**Note**: Use `.env.example` as a template.

#### Step 5: Run Backend Server
```bash
uvicorn main:app --reload --port 8000
```

✅ Backend should be running at `http://localhost:8000`  
📄 API Documentation at `http://localhost:8000/docs` (Swagger UI)

---

### 2. Frontend Setup

#### Step 1: Navigate to Frontend Directory
```bash
cd ../frontend  # From backend directory
```

#### Step 2: Install Dependencies
```bash
npm install
```

#### Step 3: Configure Environment
Create a `.env` file in `frontend/` directory:

```bash
VITE_API_URL=http://localhost:8000
```

#### Step 4: Run Development Server
```bash
npm run dev
```

✅ Frontend should be running at `http://localhost:5173`

---

### 3. Mobile App Setup (Optional)

#### Step 1: Install Flutter
Follow [Flutter installation guide](https://docs.flutter.dev/get-started/install)

#### Step 2: Setup Project
```bash
cd flutter_client
flutter pub get
```

#### Step 3: Update API Endpoint
Edit `lib/config.dart` to point to your backend:
```dart
const String API_BASE_URL = "http://YOUR_IP:8000";  // Replace with your local IP
```

#### Step 4: Run App
```bash
flutter run  # Connect Android/iOS device or start emulator first
```

---

## 🎯 Key Features Explained

### 1. 📇 Smart Contact Management

#### LinkedIn CSV/XLSX Import
- **Smart Header Detection**: Automatically finds data rows (skips "Notes:" headers in LinkedIn exports)
- **Column Mapping**: Supports various column names (First Name/first_name/FirstName, etc.)
- **Name Splitting**: Intelligently parses merged "Name" columns into first/last names
- **Extracted Fields**: Name, email, phone, company, position, LinkedIn URL

**Supported Formats**:
```
✅ LinkedIn Connections Export (CSV)
✅ Custom XLSX contact lists
✅ Headers can be in rows 1-10 (auto-detected)
```

#### VCF File Enrichment

**3-Tier Intelligent Matching Algorithm**:

1. **Exact Match**: Both first AND last names match existing contact
   - Example: `"John Smith"` ↔ `first:"John", last:"Smith"` ✅
   
2. **Partial Match**: Last name matches but first name differs (or single-word partial)
   - Example: `"Mike Smith"` ↔ `"John Smith"` ⚠️ (last name match)
   - Example: `"John"` ↔ `"John Smith"` ⚠️ (single word)
   
3. **No Match**: Completely new contact
   - Example: `"Alice Wonderland"` → ❌ Create new

**Per-Contact Actions**:
- ✅ **Merge**: Update existing contact with VCF data (name, email, phone)
- ✨ **Create New**: Add as new contact
- ⏭️ **Skip**: Ignore this VCF entry

**UI Features**:
- Real-time search within VCF imports (by name, email, phone)
- Filter by match type (exact/partial/none)
- Visual indicators for match quality

---

### 2. 📄 Document Intelligence (RAG)

#### Universal File Support
**Accepted File Types**: PDF, DOCX, XLSX, CSV, TXT, Markdown, Images (JPG/PNG), Code files, and more!

#### RAG Processing Pipeline

```
1️⃣ Upload File → 2️⃣ Detect Type → 3️⃣ Load Content → 4️⃣ Split Chunks → 5️⃣ Generate Embeddings → 6️⃣ Index to Pinecone

Example: Upload "Company_Policy.pdf" (10 pages)
- LangChain UnstructuredPDFLoader extracts text
- RecursiveCharacterTextSplitter creates ~20 chunks (500 chars each, 50 overlap)
- Sentence Transformer generates 384-dim embeddings per chunk
- Pinecone indexes with metadata: {filename, page_num, upload_date, user_id}
- Query: "What is the vacation policy?" → Returns top 5 relevant chunks
```

#### Smart Contact Extraction
When uploading CSV/XLSX files:
- **Automatic Detection**: System checks if file contains contact data
- **If Contacts Found**: Extracts to database (skips raw text indexing)
- **If Not Contacts**: Indexes as regular document

---

### 3. 👤 Person-Specific Context

**Namespace Architecture**:
```
User uploads:
- General file: "Market_Research_2024.pdf" → Namespace: "user@email.com"
- File for John: "John_Resume.pdf" → Namespace: "user@email.com_person_123"

Query: "Tell me about John's experience"
- Searches: user@email.com_person_123 (k=50)
- Also searches: user@email.com (k=10) for context
- AI gets: Resume content + any general docs mentioning John
```

**Use Cases**:
- 💼 **Recruiters**: Upload resumes for each candidate
- 📊 **Sales**: Store proposals/contracts per client
- 🎓 **Researchers**: Organize papers by author
- 💰 **VCs**: Track pitch decks per startup

---

### 4. 💬 Intelligent Chat Assistant

#### Intent-Based Routing
Uses `agent_router.py` to classify user intent:

| User Query | Detected Intent | Action |
|------------|----------------|--------|
| "Hey, how are you?" | `general_chat` | Casual conversation (no RAG) |
| "What did John send me?" | `query_data` | RAG search across documents |
| "Schedule meeting with Sarah tomorrow 3pm" | `schedule_meeting` | Google Calendar API call |

#### Chat Features
- ✅ **Streaming Responses**: Real-time token-by-token display
- ✅ **Abort Control**: Red stop button to cancel long responses
- ✅ **Source Citations**: Shows which documents were used
- ✅ **Deduplication**: Same person listed only once in results
- ✅ **Context Awareness**: Remembers conversation history

---

### 5. 📅 Meeting Scheduler

**AI-Powered Scheduling**:
```
User: "Schedule a meeting with John tomorrow at 3pm"

AI Agent:
1. Extracts: contact=John, date=tomorrow, time=3pm
2. Queries: Contacts database for "John" → Finds 1 match
3. Creates: Google Calendar event with John's email
4. Returns: "Meeting scheduled with John Doe (john@company.com) for Dec 21, 2024 at 3:00 PM IST"
```

**Features**:
- Multi-participant support
- Timezone handling (configurable to IST or local)
- Automatic email invitations
- Calendar conflict detection

---

### 6. 🔍 Advanced Search & Filtering

#### Contact Search
Searches across all fields:
```typescript
searchQuery: "IIT Engineer"
Matches:
- first_name/last_name: "IIT" or "Engineer"
- company: "IIT Bombay"
- position: "Software Engineer"
- email: "engineer@iit.ac.in"
- phone: (any digits matching)
- url: (LinkedIn URL containing "iit")
```

#### VCF Modal Search
Real-time filtering in VCF enrichment dialog:
- Name search: Partial match on full name
- Email search: Contains query
- Phone search: Digit matching
- Combine with match type filter (exact/partial/none)

---

## 📊 Database Schema

### PostgreSQL/NeonDB Tables

```sql
-- Users (Authentication)
User {
  id: Integer (PK)
  google_id: String (UNIQUE)
  email: String (UNIQUE)
  name: String
  picture: String  # Google profile picture URL
  created_at: DateTime
}

-- OAuth Credentials (Encrypted)
UserCredential {
  id: Integer (PK)
  user_id: Integer (FK → User.id, UNIQUE)
  access_token: Text (Encrypted)
  refresh_token: Text (Encrypted)
  token_uri: String
  client_id: String
  client_secret: Text (Encrypted)
  scopes: ARRAY(String)
  token_expiry: DateTime
  updated_at: DateTime
}

-- Contacts
Person {
  id: Integer (PK)
  user_email: String (FK → User.email)
  first_name: String
  last_name: String
  email: String
  phone: String
  company: String
  position: String
  url: String  # LinkedIn URL
  address: Text
  birthday: String
  notes: Text
  created_at: DateTime
}

-- Person-Specific Files
PersonFile {
  id: Integer (PK)
  person_id: Integer (FK → Person.id)
  filename: String
  original_filename: String
  file_path: String
  file_type: String
  file_size: Integer
  uploaded_at: DateTime
}

-- General User Files
UserFile {
  id: Integer (PK)
  user_email: String (FK → User.email)
  filename: String
  original_filename: String
  file_path: String
  file_type: String
  file_size: Integer
  uploaded_at: DateTime
}

-- Chat History
ChatMessage {
  id: Integer (PK)
  user_email: String (FK → User.email)
  role: String  # 'user' or 'assistant'
  content: Text
  timestamp: DateTime
}
```

### Pinecone Namespaces

```
Namespace Structure:
- "{user_email}": General knowledge base for user
- "{user_email}_person_{person_id}": Files specific to contact

Metadata Schema:
{
  user_id: str,
  person_id: Optional[str],
  person_name: Optional[str],
  person_company: Optional[str],
  filename: str,
  source: str,  # File path or chunk identifier
  chunk_index: int,
  total_chunks: int
}
```

---

## 📡 API Documentation

### Authentication Endpoints

#### `GET /auth/google/login`
Initiates Google OAuth 2.0 flow.

**Response**: Redirect to Google login page

---

#### `GET /auth/callback`
OAuth callback handler.

**Query Params**:
- `code`: Authorization code from Google

**Response**:
```json
{
  "token": "jwt_token_here",
  "user": {
    "email": "user@gmail.com",
    "name": "John Doe",
    "picture": "https://..."
  }
}
```

---

### File Endpoints

#### `POST /process`
Upload and process files (general knowledge base).

**Headers**: `Authorization: Bearer {token}`

**Form Data**:
- `user_id`: User email
- `file`: File(s) to upload (multipart)

**Response**:
```json
{
  "message": "Files processed successfully",
  "files_uploaded": ["document.pdf", "report.docx"],
  "num_chunks": 45
}
```

---

#### `GET /files`
List all files uploaded by user.

**Headers**: `Authorization: Bearer {token}`

**Query Params**:
- `user_id`: User email

**Response**:
```json
{
  "files": [
    {
      "id": 1,
      "filename": "report_2024.pdf",
      "original_filename": "Q4 Report.pdf",
      "file_size": 1024000,
      "file_type": "application/pdf",
      "uploaded_at": "2024-12-20T10:30:00Z"
    }
  ]
}
```

---

#### `DELETE /files/{filename}`
Delete a file from general knowledge base.

**Headers**: `Authorization: Bearer {token}`

**Query Params**:
- `user_id`: User email

**Response**:
```json
{
  "message": "File deleted successfully",
  "filename": "report_2024.pdf"
}
```

---

### Chat Endpoints

#### `POST /chat`
Send message to AI assistant (supports AbortController).

**Headers**: `Authorization: Bearer {token}`

**Request Body**:
```json
{
  "user_id": "user@gmail.com",
  "query": "What are John's key skills?"
}
```

**Response**:
```json
{
  "response": "Based on John's resume, his key skills include...",
  "sources": [
    {"filename": "john_resume.pdf", "page": 1}
  ]
}
```

---

#### `GET /history`
Retrieve chat history.

**Headers**: `Authorization: Bearer {token}`

**Query Params**:
- `user_id`: User email

**Response**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello",
      "timestamp": "2024-12-20T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Hi! How can I help you?",
      "timestamp": "2024-12-20T10:00:02Z"
    }
  ]
}
```

---

### Contact Endpoints

#### `GET /persons`
List all contacts for user.

**Headers**: `Authorization: Bearer {token}`

**Query Params**:
- `user_id`: User email

**Response**:
```json
{
  "persons": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@company.com",
      "phone": "+1234567890",
      "company": "Acme Corp",
      "position": "Software Engineer",
      "url": "https://linkedin.com/in/johndoe",
      "additional_files": ["resume.pdf"],
      "created_at": "2024-12-20T10:00:00Z"
    }
  ]
}
```

---

#### `POST /persons`
Create new contact manually.

**Headers**: `Authorization: Bearer {token}`

**Request Body**:
```json
{
  "user_id": "user@gmail.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@company.com",
  "phone": "+0987654321",
  "company": "TechCorp",
  "position": "Product Manager",
  "url": "https://linkedin.com/in/janesmith"
}
```

**Response**:
```json
{
  "id": 2,
  "message": "Contact created successfully"
}
```

---

#### `PUT /persons/{id}`
Update existing contact.

**Headers**: `Authorization: Bearer {token}`

**Request Body**: Same as POST (partial updates supported)

**Response**:
```json
{
  "message": "Contact updated successfully"
}
```

---

#### `DELETE /persons/{id}`
Delete contact (with full RAG cleanup).

**Headers**: `Authorization: Bearer {token}`

**Query Params**:
- `user_id`: User email

**Response**:
```json
{
  "message": "Contact deleted successfully"
}
```

**Side Effects**:
- Deletes all PersonFile records
- Removes Pinecone namespace: `{user_email}_person_{id}`
- Deletes physical files from `temp_data/person_{id}/`

---

#### `POST /persons/{id}/upload`
Upload files for specific contact.

**Headers**: `Authorization: Bearer {token}`

**Form Data**:
- `user_id`: User email
- `file`: File(s) to upload

**Response**:
```json
{
  "message": "Files uploaded successfully",
  "person_id": 1,
  "files_uploaded": ["resume.pdf"]
}
```

---

#### `DELETE /persons/{id}/files/{filename}`
Delete file from contact.

**Headers**: `Authorization: Bearer {token}`

**Query Params**:
- `user_id`: User email

**Response**:
```json
{
  "message": "File deleted successfully"
}
```

---

### VCF Enrichment Endpoints

#### `POST /persons/enrich-from-vcf`
Upload VCF file and get match report.

**Headers**: `Authorization: Bearer {token}`

**Form Data**:
- `user_id`: User email
- `file`: VCF file

**Response**:
```json
{
  "vcf_contacts": [
    {
      "vcf_name": "John Doe",
      "vcf_email": "john@company.com",
      "vcf_phone": "+1234567890",
      "match_type": "exact",
      "matched_contact": {
        "id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "company": "Acme Corp"
      }
    },
    {
      "vcf_name": "Alice",
      "vcf_email": "alice@startup.com",
      "vcf_phone": "+1122334455",
      "match_type": "none",
      "matched_contact": null
    }
  ]
}
```

---

#### `POST /persons/confirm-vcf-enrichment`
Apply VCF enrichment with per-contact actions.

**Headers**: `Authorization: Bearer {token}`

**Request Body**:
```json
{
  "user_id": "user@gmail.com",
  "actions": [
    {
      "vcf_contact": {
        "vcf_name": "John Doe",
        "vcf_email": "john@company.com",
        "vcf_phone": "+1234567890"
      },
      "action": "merge",
      "existing_contact_id": 1
    },
    {
      "vcf_contact": {
        "vcf_name": "Alice",
        "vcf_email": "alice@startup.com",
        "vcf_phone": "+1122334455"
      },
      "action": "create_new"
    },
    {
      "vcf_contact": {...},
      "action": "skip"
    }
  ]
}
```

**Response**:
```json
{
  "message": "VCF enrichment completed",
  "contacts_merged": 1,
  "contacts_created": 1,
  "contacts_skipped": 1
}
```

---

### Meeting Endpoints

#### `POST /schedule`
Schedule meeting with AI assistance.

**Headers**: `Authorization: Bearer {token}`

**Request Body**:
```json
{
  "user_id": "user@gmail.com",
  "query": "Schedule meeting with John tomorrow at 3pm"
}
```

**Response**:
```json
{
  "message": "Meeting scheduled successfully",
  "event": {
    "summary": "Meeting with John Doe",
    "start": "2024-12-21T15:00:00+05:30",
    "end": "2024-12-21T16:00:00+05:30",
    "attendees": ["john@company.com"]
  },
  "calendar_link": "https://calendar.google.com/..."
}
```

---

## 🚀 Deployment

### Firebase Deployment (Recommended)

#### Prerequisites
```bash
npm install -g firebase-tools
firebase login
```

#### Deploy Frontend
```bash
cd frontend
npm run build  # Creates dist/ folder
firebase deploy --only hosting
```

#### Deploy Backend (Firebase Functions)
```bash
firebase deploy --only functions
```

**Deployed URLs**:
- Frontend: `https://ai-personal-secreatary.web.app`
- API: `https://ai-personal-secreatary.web.app/api`

---

### Alternative: Docker Deployment

#### Build Images
```bash
# Backend
cd backend
docker build -t ai-secretary-backend .

# Frontend
cd frontend
docker build -t ai-secretary-frontend .
```

#### Run with Docker Compose
```yaml
version: '3.8'
services:
  backend:
    image: ai-secretary-backend
    ports:
      - "8000:8000"
    env_file:
      - backend/.env
  
  frontend:
    image: ai-secretary-frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
```

```bash
docker-compose up -d
```

---

### Production Checklist

- [x] **SQLite Database**: Implemented with SQLAlchemy ORM
- [ ] **PostgreSQL Migration**: For >10K contacts (use Alembic)
- [ ] **Cloud Storage**: Use S3/GCS for uploaded files (currently local filesystem)
- [ ] **OpenAI Embeddings**: Replace local Sentence Transformers (50x faster)
- [x] **Google OAuth**: Authentication implemented
- [ ] **Rate Limiting**: Add to prevent API abuse
- [ ] **HTTPS**: Enable SSL certificates (Let's Encrypt)
- [ ] **CORS**: Restrict to production domain
- [ ] **Error Monitoring**: Sentry integration
- [ ] **Logging**: Structured logging with ELK stack
- [ ] **CI/CD**: GitHub Actions for automated deployment

---

## 🐛 Troubleshooting

### Common Issues

#### Backend Won't Start
```bash
# Check Python version
python --version  # Should be 3.10+

# Reinstall dependencies
pip install -r requirements.txt --upgrade

# Check environment variables
cat .env  # Ensure all keys are set
```

#### Frontend Build Errors
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 16+
```

#### Pinecone Connection Errors
```bash
# Verify API key
echo $PINECONE_API_KEY

# Check Pinecone dashboard for index status
# Ensure index dimension matches embedding model (384 for all-MiniLM-L6-v2)
```

#### Google OAuth Not Working
```bash
# Verify redirect URI in Google Cloud Console matches:
http://localhost:5173/auth/callback

# Check CORS settings in main.py
# Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set
```

---

## 📝 Development Guide

### Adding New Features

#### 1. New API Endpoint
```python
# backend/app/routers/your_router.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/new-endpoint")
def new_feature(user_id: str):
    # Your logic here
    return {"message": "Success"}

# backend/main.py
from app.routers import your_router
app.include_router(your_router.router, prefix="/api", tags=["YourFeature"])
```

#### 2. New Frontend Component
```typescript
// frontend/src/components/NewFeature.tsx
import React from 'react';

export const NewFeature: React.FC = () => {
  return <div>New Feature</div>;
};

// frontend/src/pages/Dashboard.tsx
import { NewFeature } from '../components/NewFeature';
```

#### 3. New Custom Hook
```typescript
// frontend/src/hooks/useNewFeature.ts
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useNewFeature = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    axios.get('/api/new-endpoint').then(res => setData(res.data));
  }, []);
  
  return { data };
};
```

---

## 📈 Performance Optimization

### Current Performance Metrics

| Operation | Time | Bottleneck |
|-----------|------|------------|
| File Upload (10 pages PDF) | 30-60s | Local CPU embeddings |
| Contact Search | <100ms | Client-side filtering |
| RAG Query | 2-3s | Multi-namespace Pinecone search |
| Chat Response | 3-5s | Gemini API latency |

### Optimization Recommendations

1. **Embeddings**: Switch to OpenAI API (reduces upload time to <5s)
2. **Database**: Migrate to PostgreSQL for better indexing
3. **Caching**: Implement Redis for frequent queries
4. **CDN**: Serve static assets via CloudFlare
5. **GPU**: Use AWS/GCP instances with GPU for local embeddings

---

## 🔒 Security Best Practices

### Implemented
- ✅ OAuth 2.0 authentication (Google)
- ✅ JWT token-based sessions
- ✅ User isolation via Pinecone namespaces
- ✅ Environment variable secrets (not hardcoded)
- ✅ HTTPS redirect on Firebase Hosting
- ✅ SQL injection prevention (SQLAlchemy ORM)

### Recommended Additions
- [ ] Rate limiting (10 requests/min per user)
- [ ] Input sanitization (XSS prevention)
- [ ] Encrypted data at rest (SQLCipher for SQLite)
- [ ] API key rotation policy
- [ ] Security headers (helmet.js equivalent)

---

## 📜 License

This project is licensed under the **MIT License** - see LICENSE file for details.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support

For issues, questions, or feature requests:
- 📧 Email: support@ai-secretary.com
- 🐛 GitHub Issues: [Create Issue](https://github.com/yourusername/AI-Secretary-Unified/issues)
- 💬 Discord: [Join Community](https://discord.gg/ai-secretary)

---

## 🙏 Acknowledgments

- **Google Gemini**: Powerful AI generation
- **Pinecone**: Scalable vector database
- **LangChain**: Document processing framework
- **FastAPI**: Modern Python web framework
- **React Team**: Amazing frontend library

---

<div align="center">

**Made with ❤️ by Team Leo AI**

⭐ Star this repo if you find it helpful!

[Report Bug](https://github.com/yourusername/AI-Secretary-Unified/issues) · [Request Feature](https://github.com/yourusername/AI-Secretary-Unified/issues) · [Documentation](https://github.com/yourusername/AI-Secretary-Unified/wiki)

</div>
