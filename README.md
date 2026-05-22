# Data Sage AI

> A Unified Cognitive Query Intelligence and Autonomous Data Analytics System - talk to your database in natural language, no SQL query required.

Data Sage AI is a full-stack analytics demo with a Next.js frontend, a FastAPI backend, SQLite data, QueryForge natural-language SQL, InfraSage log analysis, live metrics, and demo insight panels.

## Project Structure

- `frontend/` - Next.js React frontend.
- `backend/` - FastAPI and Streamlit backend code.
- `backend/init_db.py` - Creates and seeds the SQLite database locally.
- `backend/api.py` - FastAPI API server.

## Run Locally

```powershell
cd backend
pip install -r requirements.txt
python init_db.py
uvicorn api:app --reload
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## AI Model

The backend is configured to call Ollama locally through `llm.py`. Start Ollama and pull the model configured in that file before using QueryForge AI generation.
