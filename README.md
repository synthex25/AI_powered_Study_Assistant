<div align="center">

# 🧠 NOtewise

### AI-Powered Study Assistant with Retrieval-Augmented Generation

> Upload your documents. Ask questions. Learn smarter — not harder.

<br/>

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

<br/>

[✨ Features](#-features) · [🏗️ Architecture](#️-architecture) · [🚀 Quick Start](#-quick-start) · [⚙️ Configuration](#️-configuration) · [🔄 LLM Providers](#-llm-providers)

</div>

---

## ✨ Features

| 🔍 RAG-Powered Chat | 📄 Document Upload | 🧩 Workspaces |
|---|---|---|
| Ask questions directly about your uploaded study materials with context-aware answers | Upload PDFs and let the AI engine process, chunk, and embed them automatically | Organize notes and documents into separate workspaces for each subject or project |

| 🔀 Multi-LLM Support | 🔐 Authentication | 📊 Diagram Rendering |
|---|---|---|
| Switch between Gemini, OpenAI, or a local Ollama instance with a single env change | JWT-based auth with email verification via Nodemailer | Render Mermaid diagrams directly inside your study notes |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│                   http://localhost:5173                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌─────────────────────┐   ┌─────────────────────┐
│   node-backend      │   │     ai-engine       │
│   (Express.js)      │   │     (FastAPI)       │
│   :4000             │   │     :8000           │
│                     │   │                     │
│ • Authentication    │   │ • RAG Chat          │
│ • Workspaces        │   │ • Document Process  │
│ • File Storage      │   │ • Content Generate  │
│ • MongoDB           │   │ • ChromaDB          │
└─────────────────────┘   └─────────────────────┘
```

---

## 🛠️ Tech Stack

<details>
<summary><b>🖥️ Frontend</b> — <code>React 19 · TypeScript · Vite · TailwindCSS 4</code></summary>

<br/>

| Technology | Purpose |
|---|---|
| React 19 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| TailwindCSS 4 | Styling |
| Redux Toolkit | State Management |
| Framer Motion | Animations |
| Mermaid | Diagram Rendering |

</details>

<details>
<summary><b>⚙️ Node.js Backend</b> — <code>Express.js · MongoDB · JWT</code></summary>

<br/>

| Technology | Purpose |
|---|---|
| Express.js | Web Framework |
| MongoDB + Mongoose | Database |
| JWT | Authentication |
| AWS S3 SDK | File Storage |
| Multer | File Uploads |
| Nodemailer | Email Service |

</details>

<details>
<summary><b>🤖 AI Engine</b> — <code>FastAPI · ChromaDB · Sentence Transformers</code></summary>

<br/>

| Technology | Purpose |
|---|---|
| FastAPI | API Framework |
| ChromaDB | Vector Database |
| Sentence Transformers | Embeddings |
| PyMuPDF | PDF Processing |
| OpenAI / Gemini / DeepInfra | LLM Providers |

</details>

---

## 🚀 Quick Start

### Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v18+)
- **Python** (v3.10+)
- **MongoDB** — local instance or [MongoDB Atlas](https://mongodb.com/atlas) (free tier)

---

### 1️⃣ Clone the Repository

```bash
git clone <repo-url>
cd AI-Study-Tutor
```

---

### 2️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

> 🌐 Runs at `http://localhost:5173`

---

### 3️⃣ Node.js Backend Setup

```bash
cd node-backend
npm install
cp .env.example .env   # Configure your environment variables
npm run dev
```

> 🌐 Runs at `http://localhost:4000`

---

### 4️⃣ AI Engine Setup

```bash
cd ai-engine

# Create & activate virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt
cp .env.example .env            # Configure your environment variables

# Start the server
uvicorn app.main:app --reload
```

> 🌐 Runs at `http://localhost:8000`

---

## ⚙️ Configuration

### `node-backend/.env`

```env
# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/cognify

# Auth
JWT_SECRET=your-secret-key

# Storage
STORAGE_PROVIDER=local

# Email (Zoho Mail)
EMAIL_USER=your-email@zoho.in
EMAIL_PASSWORD=your-app-password
```

### `ai-engine/.env`

```env
# LLM Provider
LLM_PROVIDER=gemini
GOOGLE_API_KEY=your-api-key

# Auth (must match node-backend)
JWT_SECRET=your-secret-key
```

---

## 🗄️ MongoDB Atlas Setup

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) and create a free account
2. Create a **FREE** cluster (M0 Sandbox)
3. Create a database user with a password
4. Whitelist IP → **Allow Access from Anywhere** (`0.0.0.0/0`)
5. Copy the connection string → paste into `MONGO_URI` in `node-backend/.env`

---

## 🔄 LLM Providers

Switch your LLM provider anytime by editing `ai-engine/.env`:

```env
# 🟡 Google Gemini (default)
LLM_PROVIDER=gemini
GOOGLE_API_KEY=your-key

# 🟢 OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# 🔵 Local Ollama
LLM_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
```

> No code changes needed — just update the env file and restart the AI engine.

---

## 📁 Project Structure

```
RAG-main/
├── frontend/           # ⚛️  React + TypeScript UI
├── node-backend/       # 🟩  Express.js REST API
├── ai-engine/          # 🐍  FastAPI + RAG pipeline
├── application-data/   # 💾  Local file storage
└── docs/               # 📚  Documentation website
```

---

<div align="center">

Made with ❤️ for smarter studying

</div>
