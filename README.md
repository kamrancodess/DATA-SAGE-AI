# Data Sage AI

> A Unified Cognitive Query Intelligence and Autonomous Data Analytics System - talk to your database in natural language, no SQL query required.

Data Sage AI is a full-stack data intelligence platform that turns raw database information, system logs, and infrastructure metrics into useful business insights. The main idea is simple: instead of forcing a user to know SQL, dashboards, log formats, or analytics tooling, Data Sage lets the user ask questions in normal language and receive query results, visual charts, log diagnosis, and insight-style summaries.

This project combines a modern Next.js frontend, a FastAPI backend, SQLite data storage, and a local Ollama/Qwen model for AI-assisted query generation.

## Why This Project Is Useful

Most people who need answers from data are not database engineers. They may know the business question, but not the SQL needed to answer it. Data Sage AI solves that gap by letting users ask questions like:

- "Show me revenue by country"
- "Which products have high revenue but high refunds?"
- "Find users with high spend but low activity"
- "Analyze these logs and tell me what is wrong"

The system then turns those questions into structured backend actions. QueryForge generates SQL and reads from the database, InfraSage analyzes real log text, Metrics visualizes operational data, and Insights presents scenario-based intelligence.

## Main Features

### QueryForge

QueryForge is the natural-language-to-SQL section of Data Sage AI. A user types a plain English question, and the backend converts it into SQL using the local AI model. The SQL is then executed against the SQLite database and the frontend shows the answer as a table, chart, and generated SQL.

What it does:

- Converts natural language into SQL.
- Runs the SQL against the database.
- Shows query results in a clean table.
- Shows visual bar charts for numeric results.
- Shows the generated SQL for transparency.
- Supports simple and complex questions related to users, orders, products, revenue, refunds, sessions, and events.

Why it matters:

QueryForge makes database analysis accessible to non-technical users. It removes the need to manually write SQL for every business question.

### InfraSage

InfraSage is the intelligent log analysis section. Users paste system logs into the interface, and the backend analyzes the log content to detect issues, severity, likely causes, and suggested fixes.

What it does:

- Reads pasted log text.
- Detects database, API, payment, auth, cache, memory, storage, and latency issues.
- Produces detected issues.
- Suggests practical fixes.
- Shows severity and incident timeline style output.

Why it matters:

Logs are difficult to understand when they are long or noisy. InfraSage helps convert raw logs into a clear incident explanation that developers can act on quickly.

### Metrics

The Metrics tab visualizes operational health indicators such as query volume, latency, resource utilization, and error rates.

What it does:

- Shows query volume and latency trends.
- Shows resource utilization.
- Shows error-rate trends.
- Provides hover tooltips for chart values.
- Uses a dark, glow-based dashboard design.

Why it matters:

Metrics give the user a fast view of system health. Instead of reading raw numbers, the user can understand performance patterns visually.

### Insights

The Insights tab is a demo intelligence layer that shows how machine-learning-style outputs can be presented inside the same product experience. It includes revenue forecasting, anomaly detection, user segments, and product recommendations.

What it does:

- Shows realistic revenue forecast scenarios.
- Shows anomaly tables for orders and logs.
- Shows user segment cards such as Champions, At Risk, New Users, and Hibernating.
- Shows product recommendation cards.
- Changes its displayed insight scenario based on the question the user asks.
- Provides hover details on forecast lines, anomaly rows, segment cards, and recommendation cards.

Why it matters:

Insights demonstrates how predictive and analytical features can live beside normal database querying. It makes the product feel more like a decision-support system, not just a query tool.

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide React icons
- SVG-based custom charts

What the frontend does:

- Provides the full interactive user interface.
- Sends QueryForge and InfraSage requests to the backend.
- Displays SQL results, charts, logs, insights, metrics, and hover tooltips.
- Keeps the product visually consistent with a dark gradient/glow dashboard style.

### Backend

- FastAPI
- Python
- Pydantic
- SQLite
- Uvicorn

What the backend does:

- Exposes API endpoints for frontend requests.
- Receives natural language questions.
- Calls the local AI model through Ollama.
- Validates and executes SQL safely against SQLite.
- Analyzes logs and returns structured explanations.
- Provides database and insight endpoints.

### Database

- SQLite
- Seeded using `init_db.py`

What the database contains:

- Users
- Products
- Orders
- Sessions
- Events
- Logs

Why SQLite was used:

SQLite keeps the project easy to run locally without requiring PostgreSQL, MySQL, Docker, or cloud setup. It is perfect for demonstrating the idea of natural-language data analysis.

### AI Model

- Ollama
- Qwen model configured in `backend/llm.py`

What the AI model does:

- Helps convert natural language questions into SQL.
- Supports the idea of asking database questions without manually writing SQL.
- Runs locally, so the project does not require a paid cloud AI API by default.

## Project Structure

```text
DATA-SAGE-AI/
  frontend/
    app/
    components/
    hooks/
    lib/
    public/
    styles/
    package.json
  backend/
    api.py
    app.py
    db.py
    init_db.py
    llm.py
    ml.py
    requirements.txt
    modules/
```

Important files:

- `frontend/components/landing/dashboard-section.tsx` - Main dashboard UI with QueryForge, InfraSage, Metrics, and Insights.
- `frontend/components/landing/navigation.tsx` - Website navigation and animated CTA button.
- `backend/api.py` - Main FastAPI backend.
- `backend/db.py` - SQLite connection and query helpers.
- `backend/init_db.py` - Creates and seeds the database.
- `backend/llm.py` - Ollama model connection.
- `backend/ml.py` - ML/insight-related backend logic.

## How The System Works

### QueryForge Flow

1. User types a question in the frontend.
2. Frontend sends the question to the FastAPI `/query` endpoint.
3. Backend builds a schema-aware prompt for the local AI model.
4. Ollama/Qwen generates SQL.
5. Backend validates and runs the SQL against SQLite.
6. Backend returns SQL, columns, rows, and insights.
7. Frontend displays results as table, chart, and generated SQL.

### InfraSage Flow

1. User pastes logs into InfraSage.
2. Frontend sends logs to the FastAPI `/logs` endpoint.
3. Backend analyzes the log content.
4. Backend returns detected issues, severity, timeline, and suggested fixes.
5. Frontend displays the diagnosis in a structured incident-style panel.

### Metrics Flow

1. Frontend displays operational metrics.
2. Some metric data is static/demo, while resource metrics can be fetched from local API routes.
3. SVG charts render trends with hover tooltips.

### Insights Flow

1. User asks an insight-style question.
2. Frontend maps the question into a realistic scenario.
3. Forecast, anomaly, segment, and recommendation panels update.
4. Hover tooltips provide extra details.

## Difficulties Faced And How They Were Solved

### 1. Connecting Frontend And Backend

Problem:

The frontend originally used hard-coded localhost API calls, which can break when the app is deployed or opened from another device.

Solution:

The API base was moved toward configurable usage through `NEXT_PUBLIC_API_BASE`, while still keeping localhost as the local development fallback.

### 2. Making QueryForge Work Beyond Fixed Questions

Problem:

At first, QueryForge behaved like it only understood a few common queries such as top customers or revenue by country.

Solution:

The backend was improved so the AI model receives database context and can generate SQL for broader questions related to users, orders, products, sessions, events, refunds, revenue, and activity.

### 3. Avoiding Fake-Looking Log Analysis

Problem:

InfraSage initially felt like it returned generic demo issues instead of responding to the actual logs.

Solution:

The log analysis logic was adjusted to read the pasted log content and produce issues based on real signals such as payment errors, database timeouts, cache failures, auth problems, memory usage, or latency spikes.

### 4. Handling Large Query Results In Charts

Problem:

When asking for many rows, like top 50 users, the bar chart became crowded and unreadable.

Solution:

Horizontal scrolling was added to the chart area, bar labels were simplified, chart spacing was improved, and tooltips were adjusted so users can still inspect values clearly.

### 5. Making Chart Axis Values Look Better

Problem:

The y-axis sometimes used the exact maximum database value, which made charts feel awkward and less professional.

Solution:

Axis values were rounded to cleaner numbers, so a max value like `241,523` can display against a more readable top axis such as `250,000`.

### 6. Improving Hover Tooltips

Problem:

Some bars and line points had values that were difficult to inspect, especially when the bar was tall or close to the top of the chart.

Solution:

Hover cards were improved and added to multiple visual elements so users can see exact values, labels, confidence ranges, and contextual details.

### 7. Keeping The UI Vibe Consistent

Problem:

Adding new features could easily disturb the visual style of the landing page.

Solution:

All new pieces were designed with the same dark theme, gradient borders, glow effects, rounded panels, and motion language already used by the site.

### 8. Running AI Locally

Problem:

Local AI models can be slow depending on laptop RAM, CPU, and model size.

Solution:

The project uses Ollama so models can run locally. Smaller/faster Qwen models can be used for better local performance, while the architecture can later be switched to stronger cloud models if needed.

### 9. Keeping GitHub Clean

Problem:

The workspace had generated folders like `.next`, `node_modules`, Python caches, and local database files that should not be pushed.

Solution:

A clean publish folder was created, `.gitignore` was added, and only source code plus required configuration files were committed.

## Run Locally

### Backend

```powershell
cd backend
pip install -r requirements.txt
python init_db.py
uvicorn api:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

### Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

## Ollama Setup

Install Ollama, then pull the model configured in `backend/llm.py`.

Example:

```powershell
ollama pull qwen2.5-coder:7b
ollama run qwen2.5-coder:7b
```

Then start the backend and frontend.

## Example QueryForge Questions

- Show me revenue by country
- Monthly revenue trend
- Top 10 customers by spend
- Products with low stock
- Payment failures by method
- Which products have high revenue and high refunds?
- Show users with high spend but low session activity
- Show categories with high revenue, high refunds, and low remaining stock

## Example InfraSage Logs

```log
2024-12-18 20:11:37 ERROR payment gateway timeout provider=stripe duration=8200ms
2024-12-18 20:11:42 WARN payment retry started order_id=4992 attempt=2
2024-12-18 20:11:48 ERROR payment duplicate authorization risk order_id=4992
2024-12-18 20:12:01 CRITICAL checkout failure rate exceeded threshold rate=18%
```

## Future Improvements

- Add real database connection UI for user-uploaded databases.
- Add authentication and saved workspaces.
- Add PostgreSQL/MySQL support.
- Add cloud deployment configuration.
- Add a stronger production AI model option.
- Add real-time streaming responses for long AI queries.
- Add role-based access and database permissions.

## Status

This is a working local full-stack prototype designed to demonstrate natural-language analytics, log intelligence, and dashboard-style insights in one unified interface.
