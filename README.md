# FinPilot — AI Financial Assistant

A full-stack personal finance app for Indian users. Connect your HDFC bank account via email, upload statements, set budgets, track goals, and chat with an AI advisor that has live access to your financial data.

---

## Features

### AI Chat with Live Financial Context
Ask questions in natural language — the assistant has real-time access to your transactions, spending trends, goals, and cashflow. Powered by Claude Sonnet with streaming responses.

```
"How much did I spend on food last month?"
"Can I afford a ₹50,000 MacBook by December?"
"What are my top 3 spending categories this week?"
```

The assistant uses tool calls to query your actual data rather than hallucinating answers.

### Automatic Email Ingestion
Connect your Gmail to automatically log HDFC transaction alerts as they arrive. No manual entry — the app parses SMS-style bank emails (savings account and credit card), extracts amount, merchant, date, and time, and deduplicates them by email ID.

### Smart Budget Tracking
Set monthly limits per spending category. The app suggests a budget based on your 3-month average spend so you have a realistic starting point. Progress bars turn yellow at 80% and red when you're over.

### Goal Affordability Engine
Add savings goals with a target amount and deadline. The app tells you whether your current monthly surplus is enough to reach each goal on time — with exact shortfall amounts and months remaining.

### CSV Upload
Upload HDFC bank statement CSVs to bulk-import transaction history. Transactions are auto-categorised using keyword matching (80+ merchants) with an LLM fallback for unknowns.

---

## Tech Stack

**Backend** — Python 3.12, FastAPI, SQLAlchemy, PostgreSQL  
**Frontend** — React 18, TypeScript, Vite, Recharts  
**AI** — Anthropic Claude Sonnet (streaming chat + tool use), Hugging Face (categorisation fallback)  
**Auth** — JWT + Google OAuth 2.0  
**Email** — IMAP polling with regex parsing for HDFC alert formats  

---

## Architecture

```
frontend/src/
├── api/assistant.ts        # All API calls in one place
├── auth/AuthContext.tsx     # JWT + Google OAuth state
├── components/             # CategoryBreakdown, BudgetModal, ChatPanel, ...
└── types/assistant.ts      # TypeScript interfaces mirroring backend schemas

app/
├── routes/                 # HTTP handlers — thin, delegate to services
├── services/               # Business logic (cashflow, budgets, chat, email)
├── repositories/           # SQLAlchemy queries — one file per model
├── models/                 # ORM models (User, Transaction, Category, Goal, Budget)
├── schemas/                # Pydantic v2 request/response models
└── utils/                  # CSV parser, HDFC email parser, categoriser
```

Request flow: `Route → Service → Repository → Model`

The assistant snapshot (`GET /assistant/snapshot/{user_id}`) aggregates cashflow, goals, affordability, and insights into a single payload — the primary data feed for the frontend.

---

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL

### 1. Clone and configure

```bash
git clone https://github.com/Shashank-016/FinPilot.git
cd FinPilot
cp .env.example .env
```

Edit `.env` and fill in at minimum:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/finpilot
SECRET_KEY=          # python -c "import secrets; print(secrets.token_hex(32))"
ANTHROPIC_API_KEY=   # console.anthropic.com
```

### 2. Backend

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Start the API server (creates DB tables on first run)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 4. Seed demo data (optional)

```bash
python scripts/seed_demo.py
```

Creates a demo user with pre-loaded transactions so you can explore the app without connecting a bank account.

---

## Email Integration (optional)

To auto-log HDFC transaction alerts from Gmail:

1. Enable 2-Step Verification on your Google account
2. Create an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Add to `.env`:

```env
IMAP_HOST=imap.gmail.com
IMAP_EMAIL=you@gmail.com
IMAP_PASSWORD=xxxx xxxx xxxx xxxx   # the 16-char app password
IMAP_USER_ID=                        # your user UUID from the DB
```

The poller runs in a background thread, checks every 5 minutes, and deduplicates by email UID — so restarting the server never double-counts transactions.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/assistant/snapshot/{user_id}` | Full financial snapshot (cashflow + goals + insights) |
| `POST` | `/assistant/chat` | Streaming AI chat (SSE) |
| `GET` | `/transactions/user/{user_id}` | List all transactions |
| `POST` | `/transactions/upload/{user_id}` | Upload HDFC CSV |
| `GET` | `/budgets/user/{user_id}` | List budgets |
| `POST` | `/budgets` | Create or update a budget |
| `GET` | `/budgets/suggest/{user_id}` | Get suggested limits from spending history |
| `POST` | `/goals` | Create a savings goal |
| `POST` | `/auth/register` | Register with email + password |
| `POST` | `/auth/login` | Login, returns JWT |
| `GET` | `/auth/google` | Initiate Google OAuth |

Interactive docs available at [http://localhost:8000/docs](http://localhost:8000/docs) when the server is running.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SECRET_KEY` | Yes | JWT signing key (min 32 chars) |
| `ANTHROPIC_API_KEY` | For chat | Claude API key |
| `GOOGLE_CLIENT_ID` | For Google login | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For Google login | OAuth client secret |
| `HF_API_KEY` | For LLM categorisation | Hugging Face API key |
| `IMAP_EMAIL` | For email polling | Gmail address |
| `IMAP_PASSWORD` | For email polling | Gmail App Password |
| `IMAP_USER_ID` | For email polling | UUID of user to log transactions for |

See `.env.example` for the full list with descriptions.
