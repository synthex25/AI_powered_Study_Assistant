
---

## 🛠️ Tech Stack

### Frontend (`notewise-frontend`)
| Technology | Purpose |
|------------|---------|
| React 19 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| TailwindCSS 4 | Styling |
| Redux Toolkit | State Management |
| Framer Motion | Animations |
| Mermaid | Diagram Rendering |

### Node.js Backend (`node-backend`)
| Technology | Purpose |
|------------|---------|
| Express.js | Web Framework |
| MongoDB + Mongoose | Database |
| JWT | Authentication |
| AWS S3 SDK | File Storage |
| Multer | File Uploads |
| Nodemailer | Email Service |

### Python Backend (`ai-engine`)
| Technology | Purpose |
|------------|---------|
| FastAPI | API Framework |
| ChromaDB | Vector Database |
| Sentence Transformers | Embeddings |
| PyMuPDF | PDF Processing |
| OpenAI/Gemini/DeepInfra | LLM Providers |

---

## 🚀 Quick Setup

### Prerequisites
- Node.js
- Python
- MongoDB (local or [Atlas](https://mongodb.com/atlas))

### 1. Clone Repository
```bash
git clone <repo-url>
cd AI-Study-Tutor
```

### 2. Frontend Setup
```bash
cd notewise-frontend
npm install
npm run dev
# → http://localhost:5173
```

### 3. Node.js Backend Setup
```bash
cd node-backend
npm install
cp .env.example .env  # Configure environment
npm run dev
# → http://localhost:4000
```

### 4. Python Backend Setup
```bash
cd ai-engine

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
copy .env.example .env  # Configure environment

# Run server
uvicorn app.main:app --reload
# → http://localhost:8000
```

---

## ⚙️ Environment Variables

### `node-backend/.env`
```env
# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/notewise

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

# Auth (same as node-backend)
JWT_SECRET=your-secret-key
```

---

## 🗄️ MongoDB Atlas Setup

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) and create free account
2. Create a **FREE** cluster (M0 Sandbox)
3. Create database user with password
4. Whitelist IP: "Allow Access from Anywhere"
5. Get connection string and add to `node-backend/.env`

---

## 🔄 LLM Provider Switch

Switch LLM by changing `ai-engine/.env`:

```env
# Google Gemini (default)
LLM_PROVIDER=gemini
GOOGLE_API_KEY=your-key

# OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Local Ollama
LLM_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
```

---

## 📁 Project Structure

```
RAG-main/
├── notewise-frontend/    # React frontend
├── node-backend/        # Express.js API
├── ai-engine/           # FastAPI + RAG
├── application-data/    # Local file storage
├── docs/                # Documentation website

```

---

## 🔒 Need Deployment and Project Report?

Need secure & scalable cloud deployment with project report for college or research setup ?  
📋 **[Submit Your Request](https://forms.gle/PqeiGo65jMEyQ5Az7)**

---


