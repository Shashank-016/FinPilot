from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.transaction import Transaction
from app.repositories.budget_repo import delete_budget, get_budgets_by_user, upsert_budget
from app.schemas.budget import BudgetResponse, BudgetSuggestion


def list_budgets(db: Session, user_id: UUID) -> list[BudgetResponse]:
    return get_budgets_by_user(db, user_id)


def set_budget(db: Session, user_id: UUID, category_name: str, monthly_limit: float) -> BudgetResponse:
    return upsert_budget(db, user_id, category_name, monthly_limit)


def remove_budget(db: Session, user_id: UUID, category_name: str) -> bool:
    return delete_budget(db, user_id, category_name)


def get_budget_suggestions(db: Session, user_id: UUID) -> list[BudgetSuggestion]:
    """
    Average monthly spend per expense category over the last 90 days.
    Only returns categories that had at least one transaction.
    """
    since = date.today() - timedelta(days=90)

    rows = (
        db.query(
            Category.name.label("category_name"),
            Transaction.transaction_date,
            Transaction.amount,
        )
        .join(Category, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.transaction_date >= since,
            Category.name != "Internal Transfer",
        )
        .all()
    )

    # Group amounts by (category, year-month)
    monthly: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for row in rows:
        month_key = row.transaction_date.strftime("%Y-%m")
        monthly[row.category_name][month_key] += _to_float(row.amount)

    suggestions = []
    for category_name, month_totals in monthly.items():
        n = len(month_totals)
        avg = round(sum(month_totals.values()) / n, 2)
        suggestions.append(
            BudgetSuggestion(
                category_name=category_name,
                suggested_limit=avg,
                based_on_months=n,
            )
        )

    return sorted(suggestions, key=lambda s: s.suggested_limit, reverse=True)


def _to_float(value) -> float:
    if isinstance(value, Decimal):
        return float(value)
    return float(value or 0)
