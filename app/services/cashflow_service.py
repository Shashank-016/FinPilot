from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func

from app.models.category import Category
from app.models.transaction import Transaction


def get_user_cashflow(db, user_id: UUID, start_date: date | None = None, end_date: date | None = None):
    base_query = db.query(Transaction).filter(Transaction.user_id == user_id)

    if start_date:
        base_query = base_query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        base_query = base_query.filter(Transaction.transaction_date <= end_date)

    income = _sum_amount(base_query, "income")
    expenses = _sum_amount(base_query, "expense")
    surplus = round(income - expenses, 2)
    savings_rate = round((surplus / income) * 100, 2) if income else 0

    return {
        "user_id": user_id,
        "start_date": start_date,
        "end_date": end_date,
        "income": income,
        "expenses": expenses,
        "surplus": surplus,
        "savings_rate_percent": savings_rate,
        "expense_breakdown": _expense_breakdown(db, user_id, expenses, start_date, end_date),
    }


def assess_goal_affordability(monthly_surplus: float, monthly_required: float):
    if monthly_required <= 0:
        return {
            "status": "achieved",
            "shortfall": 0,
            "surplus_after_goal": round(monthly_surplus, 2),
        }

    surplus_after_goal = round(monthly_surplus - monthly_required, 2)
    if monthly_surplus >= monthly_required:
        status = "on_track"
    elif monthly_surplus >= monthly_required * 0.75:
        status = "tight"
    else:
        status = "not_on_track"

    return {
        "status": status,
        "shortfall": round(max(monthly_required - monthly_surplus, 0), 2),
        "surplus_after_goal": surplus_after_goal,
    }


def _sum_amount(query, transaction_type: str):
    value = query.filter(Transaction.type == transaction_type).with_entities(func.sum(Transaction.amount)).scalar()
    return round(_to_float(value), 2)


def _expense_breakdown(db, user_id: UUID, total_expenses: float, start_date: date | None, end_date: date | None):
    query = (
        db.query(
            Category.name.label("category"),
            func.sum(Transaction.amount).label("total"),
        )
        .join(Category, Transaction.category_id == Category.id, isouter=True)
        .filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Category.name != "Internal Transfer",
        )
    )

    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)

    rows = query.group_by(Category.name).order_by(func.sum(Transaction.amount).desc()).all()
    return [
        {
            "category": row.category or "uncategorized",
            "total": round(_to_float(row.total), 2),
            "share_percent": round((_to_float(row.total) / total_expenses) * 100, 2)
            if total_expenses
            else 0,
        }
        for row in rows
    ]


def _to_float(value):
    if isinstance(value, Decimal):
        return float(value)
    return float(value or 0)
