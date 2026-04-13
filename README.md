# AI-Powered Study Assistant

A full-stack AI application that transforms study materials (PDFs, text, URLs) into structured notes, flashcards, quizzes, and an interactive RAG-based AI tutor.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Project Structure](#project-structure)
3. [File Descriptions](#file-descriptions)
4. [API Overview](#api-overview)
5. [Setup & Installation](#setup--installation)
6. [Running the Application](#running-the-application)
7. [Running Tests](#running-tests)
8. [Environment Variables](#environment-variables)
9. [Tech Stack](#tech-stack)

---

## System Architecture

```
User (Browser)
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend  ·  React + Vite  ·  http://localhost:5173        │
│  - Auth UI, Workspace UI, Chat UI, Flashcards, Quizzes      │
└──────────────────────┬──────────────────────────────────────┘
                       │  REST (JWT)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Node.js Backend  ·  Express  ·  http://localhost:4000      │
│  - Auth, Workspace CRUD, File Storage, MongoDB              │
└──────────────────────┬──────────────────────────────────────┘
                       │  REST (JWT)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI AI Service  ·  Python  ·  http://127.0.0.1:8000    │
│  - RAG Chat, Content Generation, Vector Store (ChromaDB)    │
└──────────────────────┬──────────────────────────────────────┘
                       │  HTTPS
                       ▼
              Google Gemini API
              (LLM — gemini-2.5-flash)
```

**Request flow:**
```
User → React → Node.js (auth + storage) → FastAPI (AI processing) → Gemini → Response
```

---

## Project Structure

```
AI-POWERED-STUDY-ASSISTANT/
│
├── frontend/                        # React (Vite) — user interface
│   ├── src/
│   │   ├── App.tsx                  # Root router and Redux provider
│   │   ├── main.tsx                 # Vite entry point
│   │   ├── config/
│   │   │   └── axios.ts             # Axios instances with JWT interceptors
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.tsx    # Google OAuth + email login UI
│   │   │   │   └── ProtectedRoutes.tsx  # Route guard for authenticated pages
│   │   │   ├── chat/
│   │   │   │   └── ChatBox.tsx      # AI chat interface (RAG-powered)
│   │   │   ├── dashboard/
│   │   │   │   ├── StudyPlayground.tsx  # Main workspace view
│   │   │   │   └── WelcomeDashboard.tsx # Workspace list and creation
│   │   │   ├── flashcards/
│   │   │   │   └── Flashcards.tsx   # Interactive flashcard component
│   │   │   ├── quiz/
│   │   │   │   └── Quiz.tsx         # MCQ quiz component
│   │   │   └── common/
│   │   │       ├── PDFViewer.tsx    # In-browser PDF renderer
│   │   │       ├── ResearchNotes.tsx # AI-generated notes renderer
│   │   │       └── ErrorBanner.tsx  # Standardised error display
│   │   ├── services/
│   │   │   ├── authService.ts       # Auth API calls (login, refresh, logout)
│   │   │   ├── workspaceService.ts  # Workspace + source CRUD, AI generation
│   │   │   ├── chatService.ts       # Chat session management
│   │   │   └── masterService.ts     # Heatmap and quiz tracking
│   │   ├── hooks/
│   │   │   ├── useWorkspace.ts      # Workspace state + all workspace actions
│   │   │   └── useAuth.ts           # Auth state helpers
│   │   ├── store/
│   │   │   └── store.ts             # Redux store with redux-persist
│   │   └── types/
│   │       └── index.ts             # Shared TypeScript interfaces
│   ├── .env                         # VITE_API_URL, VITE_AI_URL, VITE_SSO_CLIENT_ID
│   └── vite.config.ts               # Vite build configuration
│
├── backend/                         # Node.js (Express + TypeScript) — API server
│   ├── src/
│   │   ├── server.ts                # Express app entry point, route registration
│   │   ├── config/
│   │   │   ├── index.ts             # Centralised config from environment variables
│   │   │   └── database.ts          # MongoDB connection with reconnect options
│   │   ├── routes/
│   │   │   ├── authRoutes.ts        # /api/auth/* — login, register, refresh, logout
│   │   │   ├── workspaceRoutes.ts   # /api/workspaces/* — CRUD + source management
│   │   │   ├── chatRoutes.ts        # /api/chat/* — chat session persistence
│   │   │   └── masterRoutes.ts      # /api/master/* — heatmap, quiz scores
│   │   ├── controllers/
│   │   │   ├── authController.ts    # Google OAuth, email/OTP auth logic
│   │   │   ├── workspaceController.ts # Workspace and source business logic
│   │   │   ├── chatController.ts    # Chat session CRUD
│   │   │   └── masterController.ts  # User activity tracking
│   │   ├── middleware/
│   │   │   ├── jwtAuth.ts           # JWT verification middleware
│   │   │   └── errorHandler.ts      # Global error handler
│   │   ├── models/
│   │   │   ├── User.ts              # Mongoose user schema
│   │   │   ├── Workspace.ts         # Workspace + sources schema
│   │   │   ├── ChatSession.ts       # Chat history schema
│   │   │   └── RefreshToken.ts      # Refresh token store schema
│   │   ├── services/
│   │   │   ├── authService.ts       # Token generation, OTP, Google verification
│   │   │   ├── storageService.ts    # Local/S3 file storage abstraction
│   │   │   └── emailService.ts      # OTP email delivery
│   │   └── utils/
│   │       ├── logger.ts            # Winston structured logger
│   │       └── apiResponse.ts       # Standardised JSON response helpers
│   ├── .env                         # MONGO_URI, JWT_SECRET, GOOGLE_CLIENT_ID
│   └── tsconfig.json
│
├── ai/                              # FastAPI (Python) — AI processing service
│   ├── app/
│   │   ├── main.py                  # FastAPI app, CORS config, router registration
│   │   ├── config.py                # Pydantic settings loaded from .env
│   │   ├── api/
│   │   │   ├── router.py            # Mounts all routers under /api prefix
│   │   │   ├── chat.py              # POST /api/chat — RAG chat endpoint
│   │   │   ├── workspace.py         # POST /api/workspace/process-workspace
│   │   │   └── progress.py          # GET /api/progress/stream/:id — SSE progress
│   │   ├── core/
│   │   │   ├── auth.py              # JWT decode + get_current_user dependency
│   │   │   ├── vector_store.py      # ChromaDB wrapper for document embeddings
│   │   │   └── retrieval_engine.py  # Advanced retrieval (HyDE + BM25 + re-ranking)
│   │   ├── services/
│   │   │   ├── rag_agent.py         # RAG pipeline — retrieval + LLM answer generation
│   │   │   ├── deep_content_generator.py  # Single-call AI content generation
│   │   │   ├── document_processor.py      # PDF text extraction (PyMuPDF)
│   │   │   ├── url_scraper.py             # Web page content scraper
│   │   │   └── progress_stream.py         # SSE progress event manager
│   │   ├── providers/
│   │   │   ├── base.py              # Abstract LLM provider interface
│   │   │   ├── factory.py           # Provider factory (gemini/openai/ollama/bedrock)
│   │   │   └── gemini.py            # Google Gemini API implementation
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic request/response schemas
│   │   └── utils/
│   │       └── rate_limiter.py      # Token-bucket rate limiter for API calls
│   ├── tests/
│   │   ├── conftest.py              # Shared fixtures, JWT helpers, all mocks
│   │   ├── test_auth.py             # JWT validation, expiry, missing header tests
│   │   ├── test_chat.py             # Chat endpoint — success, errors, rate limits
│   │   └── test_workspace.py        # Workspace processing + upload endpoint tests
│   ├── .env                         # LLM_PROVIDER, GOOGLE_API_KEY, JWT_SECRET
│   ├── requirements.txt             # Python dependencies
│   └── pytest.ini                   # Pytest configuration
│
└── application-data/                # Local file storage (PDFs, text files)
    └── {email}/workspaces/{id}/
```

---

## File Descriptions

### Frontend — Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Defines all routes; wraps app in Redux Provider and PersistGate |
| `config/axios.ts` | Two Axios instances (Node + FastAPI) with shared JWT refresh-and-retry interceptor |
| `hooks/useWorkspace.ts` | Central hook managing workspace state, source uploads, and AI generation calls |
| `services/workspaceService.ts` | Calls Node.js for CRUD and FastAPI for AI content generation |
| `components/chat/ChatBox.tsx` | Sends queries to FastAPI `/api/chat`, renders markdown responses |
| `components/dashboard/StudyPlayground.tsx` | Main workspace UI — sources, tabs, AI notes, chat panel |

### Backend — Key Files

| File | Purpose |
|------|---------|
| `server.ts` | Bootstraps Express, registers CORS, routes, and global error handler |
| `middleware/jwtAuth.ts` | Verifies Bearer token on protected routes; attaches user to request |
| `config/database.ts` | Connects to MongoDB Atlas with heartbeat and timeout options |
| `controllers/workspaceController.ts` | Handles PDF upload, source management, and generated content persistence |
| `controllers/authController.ts` | Google OAuth verification, email/OTP registration, token refresh |
| `models/Workspace.ts` | Mongoose schema for workspaces, sources, and generated AI content |

### AI Service — Key Files

| File | Purpose |
|------|---------|
| `main.py` | Creates FastAPI app, configures CORS for all origins, mounts routers |
| `config.py` | Pydantic BaseSettings — loads all config from `.env` with validation |
| `api/chat.py` | POST `/api/chat` — detects greetings vs RAG queries, returns structured response |
| `api/workspace.py` | POST `/api/workspace/process-workspace` — extracts text, calls generator, returns content |
| `api/progress.py` | GET `/api/progress/stream/:id` — Server-Sent Events for real-time progress |
| `core/auth.py` | Decodes JWT (shared secret with Node.js), provides `get_current_user` dependency |
| `core/vector_store.py` | ChromaDB wrapper — stores and queries document chunk embeddings |
| `services/rag_agent.py` | Retrieves relevant chunks from vector store, builds prompt, calls LLM |
| `services/deep_content_generator.py` | Single Gemini API call generating notes + flashcards + quizzes as JSON |
| `providers/gemini.py` | Gemini REST API client with retry-on-429 and deprecated model aliasing |
| `providers/factory.py` | Returns the correct LLM provider instance based on `LLM_PROVIDER` setting |

### Tests — Key Files

| File | Purpose |
|------|---------|
| `tests/conftest.py` | JWT token helpers, mock LLM fixtures, mock vector store, TestClient setup |
| `tests/test_auth.py` | 16 tests — valid/expired/missing tokens, wrong secret, missing user ID |
| `tests/test_chat.py` | 23 tests — success, greetings, validation, 429/402/500 error simulation |
| `tests/test_workspace.py` | 32 tests — content generation, auth, validation, PDF upload, large inputs |

---

## API Overview

### Authentication — Node.js (`http://localhost:4000`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/google` | Google OAuth sign-in | Public |
| POST | `/api/auth/register` | Email + password registration | Public |
| POST | `/api/auth/login` | Email + password login | Public |
| POST | `/api/auth/verify-otp` | Verify OTP code | Public |
| POST | `/api/auth/refresh-token` | Refresh access token | Public |
| POST | `/api/auth/logout` | Revoke refresh token | Public |

### Workspaces — Node.js

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/workspaces` | List user workspaces | JWT |
| POST | `/api/workspaces` | Create workspace | JWT |
| GET | `/api/workspaces/:id` | Get workspace by ID | JWT |
| PUT | `/api/workspaces/:id` | Update workspace | JWT |
| DELETE | `/api/workspaces/:id` | Delete workspace | JWT |
| POST | `/api/workspaces/:id/sources/pdf` | Upload PDF source | JWT |
| POST | `/api/workspaces/:id/sources/text` | Add text source | JWT |
| POST | `/api/workspaces/:id/sources/url` | Add URL source | JWT |
| PATCH | `/api/workspaces/:id/generated-content` | Save AI results | JWT |

### AI Service — FastAPI (`http://127.0.0.1:8000`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/chat` | RAG-based AI chat query | JWT |
| POST | `/api/workspace/process-workspace` | Generate notes, flashcards, quizzes | JWT |
| GET | `/api/progress/stream/:id` | SSE real-time progress stream | None |
| POST | `/upload_pdfs/` | Upload + index PDFs for RAG | None |
| GET | `/health` | Service health check | None |

**Chat request body:**
```json
{
  "query": "What is machine learning?",
  "document_ids": ["workspace_id_here"],
  "chat_history": []
}
```

**Process workspace request body:**
```json
{
  "workspaceId": "abc123",
  "sources": [
    { "id": "s1", "type": "text", "name": "My Notes", "content": "..." }
  ],
  "language": "en"
}
```

**Process workspace response:**
```json
{
  "workspaceId": "abc123",
  "title": "📚 Study Guide",
  "summary": "...",
  "notes": "<article>...</article>",
  "flashcards": [{ "front": "Term", "back": "Definition" }],
  "quizzes": [{ "question": "...", "options": [...], "correctAnswer": "A" }],
  "recommendations": "<div>...</div>"
}
```

---

## Setup & Installation

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key ([aistudio.google.com](https://aistudio.google.com))
- Google OAuth client ID ([console.cloud.google.com](https://console.cloud.google.com))

### 1. Clone the repository

```bash
git clone <repository-url>
cd AI-POWERED-STUDY-ASSISTANT
```

### 2. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:4000
VITE_NODE_APP=http://localhost:4000
VITE_AI_URL=http://127.0.0.1:8000
VITE_FASTAPI_URL=http://127.0.0.1:8000
VITE_FAST_WS=ws://127.0.0.1:8000
VITE_SSO_CLIENT_ID=your-google-client-id
```

### 3. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=4000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES_IN=12h
JWT_REFRESH_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=http://localhost:5173
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=../application-data
FASTAPI_URL=http://127.0.0.1:8000
```

### 4. AI service setup

```bash
cd ai
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create `ai/.env`:
```env
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
GOOGLE_API_KEY=your-gemini-api-key
JWT_SECRET=your-jwt-secret-min-32-chars   # Must match backend JWT_SECRET
DEBUG=true
CHROMA_PERSIST_DIR=./chroma_db
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=../application-data
```

> **Important:** `JWT_SECRET` must be identical in both `backend/.env` and `ai/.env`.

---

## Running the Application

Start all three services in separate terminals:

```bash
# Terminal 1 — AI Service
cd ai
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS/Linux
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```bash
# Terminal 2 — Node.js Backend
cd backend
npm run dev
```

```bash
# Terminal 3 — Frontend
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Running Tests

```bash
cd ai

# Activate virtual environment
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS/Linux

# Run full test suite
pytest tests/ -v

# Run a specific test file
pytest tests/test_chat.py -v

# Run with coverage report
pytest tests/ --cov=app --cov-report=term-missing
```

**Test suite summary:**

| File | Tests | Coverage |
|------|-------|---------|
| `test_auth.py` | 16 | JWT validation, expiry, missing/invalid tokens |
| `test_chat.py` | 23 | Success, greetings, validation, 429/402/500 errors |
| `test_workspace.py` | 32 | Content generation, auth, PDF upload, large inputs |
| **Total** | **71** | All Gemini API calls mocked — no real API usage |

---

## Environment Variables

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Node.js backend base URL |
| `VITE_AI_URL` | FastAPI service base URL (use `127.0.0.1`, not `localhost`) |
| `VITE_FAST_WS` | WebSocket URL for streaming |
| `VITE_SSO_CLIENT_ID` | Google OAuth client ID |

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL (e.g. `12h`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `STORAGE_PROVIDER` | `local` or `s3` |

### AI Service (`ai/.env`)

| Variable | Description |
|----------|-------------|
| `LLM_PROVIDER` | `gemini`, `openai`, `deepinfra`, `ollama`, or `bedrock` |
| `LLM_MODEL` | Model name (e.g. `gemini-2.5-flash`) |
| `GOOGLE_API_KEY` | Gemini API key |
| `JWT_SECRET` | Must match `backend/.env` JWT_SECRET exactly |
| `CHROMA_PERSIST_DIR` | Path for ChromaDB vector store persistence |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Redux Toolkit, Axios |
| Backend | Node.js, Express, TypeScript, Mongoose, JWT |
| AI Service | FastAPI, Python, ChromaDB, sentence-transformers |
| LLM | Google Gemini 2.5 Flash (via REST API) |
| Database | MongoDB Atlas |
| File Storage | Local filesystem / AWS S3 |
| Testing | Pytest, FastAPI TestClient, unittest.mock |
| Auth | JWT (HS256), Google OAuth 2.0, OTP email |
