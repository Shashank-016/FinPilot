import json
import logging
from datetime import date, timedelta
from typing import Generator

import anthropic
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session

from app.config import ANTHROPIC_API_KEY, TAVILY_API_KEY
from app.models.category import Category
from app.models.transaction import Transaction
from app.services.assistant_service import get_assistant_snapshot
from app.services.cashflow_service import get_user_cashflow

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-6"

TOOLS: list[dict] = [
    {
        "name": "get_transactions",
        "description": (
            "Fetch the user's actual bank transactions with optional filters. "
            "Use this for questions about specific spending history, merchants, or to list transactions in a period."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "start_date": {"type": "string", "description": "Start date YYYY-MM-DD"},
                "end_date": {"type": "string", "description": "End date YYYY-MM-DD"},
                "category": {"type": "string", "description": "Filter by category name (partial match, e.g. 'Food')"},
                "type": {"type": "string", "enum": ["income", "expense"], "description": "Transaction type"},
                "min_amount": {"type": "number", "description": "Minimum transaction amount in ₹"},
                "max_amount": {"type": "number", "description": "Maximum transaction amount in ₹"},
                "search": {"type": "string", "description": "Keyword to search in description/merchant name"},
                "limit": {"type": "integer", "description": "Max rows to return (default 20, max 100)"},
            },
        },
    },
    {
        "name": "get_spending_summary",
        "description": (
            "Get income, expenses, surplus, and per-category breakdown for a time period. "
            "Use this for 'how much did I spend in March', 'what was my income last month', etc."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "year": {"type": "integer", "description": "Year, e.g. 2025 — use alone for the full year"},
                "month": {"type": "integer", "description": "Month 1–12 — combine with year for a specific month"},
                "start_date": {"type": "string", "description": "Start date YYYY-MM-DD (alternative to year/month)"},
                "end_date": {"type": "string", "description": "End date YYYY-MM-DD"},
            },
        },
    },
    {
        "name": "get_cashflow_trend",
        "description": (
            "Get a month-by-month income / expense / surplus table. "
            "Use this for trend questions or comparing multiple months."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "months": {"type": "integer", "description": "Number of past months to include (default 6, max 12)"},
            },
        },
    },
    {
        "name": "get_goals_status",
        "description": "Get all financial goals with progress, deadline, monthly savings required, and affordability status.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "search_web",
        "description": (
            "Search the internet for current financial information: interest rates, stock/mutual fund prices, "
            "RBI/SEBI news, inflation data, financial product comparisons, EMI calculators, tax rules — "
            "anything not available in the user's own transaction data."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
            },
            "required": ["query"],
        },
    },
]

TOOL_LABELS = {
    "get_transactions": "Querying your transactions…",
    "get_spending_summary": "Analyzing your spending…",
    "get_cashflow_trend": "Analyzing spending trends…",
    "get_goals_status": "Checking your goals…",
    "search_web": "Searching the internet…",
}

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        if not ANTHROPIC_API_KEY:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. "
                "Add it to your .env file to enable the AI assistant."
            )
        _client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _client


def stream_chat(
    db: Session,
    user_id: str,
    message: str,
    history: list[dict],
) -> Generator[str, None, None]:
    snapshot = get_assistant_snapshot(db, user_id)
    system_prompt = _build_system_prompt(snapshot)
    messages = _build_messages(history, message)
    claude = _get_client()

    while True:
        with claude.messages.stream(
            model=MODEL,
            messages=messages,
            tools=TOOLS,
            system=system_prompt,
            max_tokens=4096,
        ) as stream:
            for event in stream:
                etype = getattr(event, "type", None)

                if etype == "content_block_start":
                    cb = event.content_block
                    if cb.type == "tool_use":
                        label = TOOL_LABELS.get(cb.name, "Working…")
                        yield f"data: {json.dumps({'type': 'tool_start', 'tool': cb.name, 'label': label})}\n\n"

                elif etype == "content_block_delta":
                    delta = event.delta
                    if delta.type == "text_delta":
                        yield f"data: {json.dumps({'type': 'text', 'content': delta.text})}\n\n"

            final_message = stream.get_final_message()

        if final_message.stop_reason == "tool_use":
            tool_results = []
            for block in final_message.content:
                if block.type == "tool_use":
                    result = _execute_tool(db, user_id, block.name, block.input)
                    yield f"data: {json.dumps({'type': 'tool_end', 'tool': block.name})}\n\n"
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, default=str),
                    })

            assistant_content = [
                {"type": "text", "text": b.text} if b.type == "text"
                else {"type": "tool_use", "id": b.id, "name": b.name, "input": b.input}
                for b in final_message.content
            ]
            messages.append({"role": "assistant", "content": assistant_content})
            messages.append({"role": "user", "content": tool_results})
        else:
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return


# ── Tool implementations ────────────────────────────────────────────────────

def _execute_tool(db: Session, user_id: str, name: str, tool_input: dict) -> dict:
    try:
        if name == "get_transactions":
            return _tool_get_transactions(db, user_id, **tool_input)
        if name == "get_spending_summary":
            return _tool_get_spending_summary(db, user_id, **tool_input)
        if name == "get_cashflow_trend":
            return _tool_get_cashflow_trend(db, user_id, **tool_input)
        if name == "get_goals_status":
            return _tool_get_goals_status(db, user_id)
        if name == "search_web":
            return _tool_search_web(tool_input.get("query", ""))
        return {"error": f"Unknown tool: {name}"}
    except Exception as exc:
        logger.error("Tool %s failed: %s", name, exc, exc_info=True)
        return {"error": str(exc)}


def _tool_get_transactions(
    db: Session, user_id: str,
    start_date=None, end_date=None, category=None,
    type=None, min_amount=None, max_amount=None,
    search=None, limit=20,
) -> dict:
    query = (
        db.query(Transaction, Category.name.label("cat_name"))
        .outerjoin(Category, Transaction.category_id == Category.id)
        .filter(Transaction.user_id == user_id)
    )
    if start_date:
        query = query.filter(Transaction.transaction_date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(Transaction.transaction_date <= date.fromisoformat(end_date))
    if type:
        query = query.filter(Transaction.type == type)
    if category:
        query = query.filter(Category.name.ilike(f"%{category}%"))
    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)
    if search:
        query = query.filter(Transaction.description.ilike(f"%{search}%"))

    limit = min(int(limit or 20), 100)
    rows = query.order_by(Transaction.transaction_date.desc()).limit(limit).all()

    return {
        "count": len(rows),
        "transactions": [
            {
                "date": str(txn.transaction_date),
                "amount": float(txn.amount),
                "type": txn.type,
                "category": cat_name or "Uncategorized",
                "description": txn.description or "",
            }
            for txn, cat_name in rows
        ],
    }


def _tool_get_spending_summary(
    db: Session, user_id: str,
    year=None, month=None, start_date=None, end_date=None,
) -> dict:
    if year and month:
        s = date(int(year), int(month), 1)
        e = (s + relativedelta(months=1)) - timedelta(days=1)
    elif year:
        s, e = date(int(year), 1, 1), date(int(year), 12, 31)
    else:
        s = date.fromisoformat(start_date) if start_date else None
        e = date.fromisoformat(end_date) if end_date else None
    return get_user_cashflow(db, user_id, s, e)


def _tool_get_cashflow_trend(db: Session, user_id: str, months=6) -> dict:
    months = min(int(months or 6), 12)
    today = date.today()
    rows = []
    for i in range(months - 1, -1, -1):
        start = today.replace(day=1) - relativedelta(months=i)
        end = (start + relativedelta(months=1)) - timedelta(days=1)
        cf = get_user_cashflow(db, user_id, start, end)
        rows.append({
            "month": start.strftime("%B %Y"),
            "income": cf["income"],
            "expenses": cf["expenses"],
            "surplus": cf["surplus"],
            "savings_rate_pct": cf["savings_rate_percent"],
        })
    return {"trend": rows}


def _tool_get_goals_status(db: Session, user_id: str) -> dict:
    snap = get_assistant_snapshot(db, user_id)
    goals = []
    for g in snap["goals"]:
        aff = next((a for a in snap["goal_affordability"] if str(a["goal_id"]) == str(g.id)), None)
        goals.append({
            "name": g.name,
            "target_amount": float(g.target_amount),
            "saved_amount": float(g.current_amount),
            "progress_pct": float(aff["progress_percent"]) if aff else 0.0,
            "deadline": str(g.deadline) if g.deadline else None,
            "monthly_required": float(aff["monthly_required"]) if aff and aff.get("monthly_required") else None,
            "status": aff["affordability_status"] if aff else "unknown",
        })
    return {
        "goals": goals,
        "monthly_surplus": float(snap["cashflow"]["surplus"]),
    }


def _tool_search_web(query: str) -> dict:
    if not TAVILY_API_KEY:
        return {"error": "Web search unavailable — TAVILY_API_KEY not set in .env."}
    try:
        from tavily import TavilyClient  # lazy import — only needed when called
        client = TavilyClient(api_key=TAVILY_API_KEY)
        response = client.search(query=query, max_results=5, search_depth="basic")
        return {
            "query": query,
            "results": [
                {
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "snippet": r.get("content", "")[:600],
                }
                for r in response.get("results", [])
            ],
        }
    except Exception as exc:
        return {"error": f"Search failed: {exc}"}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _build_messages(history: list[dict], message: str) -> list[dict]:
    # history = previous turns only (not the current message)
    messages = []
    for m in history[-18:]:
        messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": message})
    return messages


def _build_system_prompt(snapshot: dict) -> str:
    cf = snapshot["cashflow"]
    breakdown_lines = [
        f"  - {b['category']}: ₹{b['total']:,.0f} ({b['share_percent']:.1f}%)"
        for b in cf.get("expense_breakdown", [])[:8]
    ]
    return (
        "You are FinPilot, a sharp and friendly personal finance advisor for an Indian user. "
        "You have full access to the user's live financial data via tools, and you can search the internet "
        "for current rates, market data, and financial news.\n\n"
        "GUIDELINES:\n"
        "- Always use ₹ (INR). Be specific with numbers.\n"
        "- For spending/transaction questions → call get_spending_summary or get_transactions.\n"
        "- For trend questions → call get_cashflow_trend.\n"
        "- For goal questions → call get_goals_status.\n"
        "- For interest rates, stock prices, mutual funds, RBI news → call search_web.\n"
        "- Format responses with markdown: use **bold**, bullet lists, and tables where helpful.\n"
        "- Keep answers concise and actionable unless the user asks for detail.\n"
        "- Never make up numbers.\n\n"
        "CURRENT SNAPSHOT (summary — use tools for details):\n"
        f"  Income:       ₹{cf['income']:,.0f}\n"
        f"  Expenses:     ₹{cf['expenses']:,.0f}\n"
        f"  Surplus:      ₹{cf['surplus']:,.0f}\n"
        f"  Savings rate: {cf['savings_rate_percent']:.1f}%\n\n"
        "TOP SPENDING CATEGORIES:\n"
        f"{chr(10).join(breakdown_lines) or '  No data yet.'}"
    )
