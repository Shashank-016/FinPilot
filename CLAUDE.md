# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Financial Assistant — a full-stack web app for personal finance management. Users can upload HDFC bank statement CSVs, track goals, and receive AI-generated spending insights. The backend computes financial snapshots consumed by both the frontend and future AI agents.

## Commands

### Backend (run from project root)
```powershell
# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Seed demo data (creates user demo@financial-assistant.local)
python scripts/seed_demo.py
```

### Frontend (run from `frontend/`)
```powershell
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # TypeScript check + production bundle
npm run preview  # Serve production build locally
```

### Environment
Copy `.env` and set `DATABASE_URL` to a PostgreSQL connection string before starting the backend.

## Architecture

### Backend (`app/`) — FastAPI + SQLAlchemy + PostgreSQL

Layered architecture: **routes → services → repositories → models**.

- **routes/**: HTTP handlers; thin — delegate all logic to services.
- **services/**: Business logic. Key services:
  - `cashflow_service.py` — computes income, expenses, surplus, savings rate, and per-category breakdowns for a date range.
  - `insight_service.py` — generates spending pattern insights and goal guidance records.
  - `assistant_service.py` — assembles the full financial snapshot (cashflow + goals + insights + affordability) returned by `/assistant/snapshot/{user_id}`. This is the primary data feed for the frontend and any AI agents.
- **repositories/**: Raw SQLAlchemy queries; one file per model.
- **models/**: SQLAlchemy ORM (Users, Transactions, Goals, Insights, Categories). UUIDs as PKs.
- **schemas/**: Pydantic v2 request/response models.
- **utils/csv_parser.py**: Parses HDFC bank statement CSV format (date format, debit/credit columns) into `Transaction` objects.

CORS is configured to allow `localhost:5173` and `localhost:8000`.

### Frontend (`frontend/src/`) — React + TypeScript + Vite

Single-page app with screen-based navigation (no router library — state is managed in `App.tsx`).

- **App.tsx**: Top-level component. Fetches snapshot on mount, owns screen state, passes data down.
- **api/assistant.ts**: All fetch calls to the backend. Single API client file — add new endpoints here.
- **components/**: Reusable display components (cards, charts, transaction list, goal progress bars).
- **types/**: TypeScript interfaces mirroring backend Pydantic schemas.
- **utils/**: Currency/date formatting helpers.

### Data Flow

1. Frontend calls `GET /assistant/snapshot/{user_id}` on load.
2. `assistant_service` aggregates cashflow, goals, insights, and goal affordability into one payload.
3. Frontend renders four screens (Overview, Goals, Transactions, Insights) from this snapshot.
4. Transactions can be added individually or bulk-uploaded via HDFC CSV (`POST /transactions/upload`).
5. Insights are generated server-side and stored; fetching `/insights/generate/{user_id}` triggers regeneration.

### Demo User
The seed script creates a demo user with ID `e209cc12-83d5-454b-9d76-fabda40022a7` (also set in `frontend/.env` as `VITE_DEMO_USER_ID`).
