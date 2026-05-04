from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from app.repositories.goal_repo import get_goals_by_user
from app.repositories.insight_repo import get_insights_by_user
from app.services.cashflow_service import assess_goal_affordability, get_user_cashflow


def get_assistant_snapshot(db, user_id: UUID):
    cashflow = get_user_cashflow(db, user_id)
    goals = get_goals_by_user(db, user_id)
    insights = get_insights_by_user(db, user_id)

    return {
        "user_id": user_id,
        "generated_at": datetime.utcnow(),
        "cashflow": cashflow,
        "goals": goals,
        "goal_affordability": [
            _goal_affordability_snapshot(goal, cashflow["surplus"]) for goal in goals
        ],
        "insights": insights,
    }


def _goal_affordability_snapshot(goal, monthly_surplus: float):
    target = _to_float(goal.target_amount)
    current = _to_float(goal.current_amount)
    remaining = round(max(target - current, 0), 2)
    progress_percent = round((current / target) * 100, 2) if target else 0

    months_left = _months_until(goal.deadline) if goal.deadline and remaining > 0 else None
    monthly_required = round(remaining / months_left, 2) if months_left else 0
    affordability = assess_goal_affordability(monthly_surplus, monthly_required)

    return {
        "goal_id": goal.id,
        "goal_name": goal.name,
        "progress_percent": progress_percent,
        "remaining_amount": remaining,
        "months_left": months_left,
        "monthly_required": monthly_required,
        "monthly_surplus": monthly_surplus,
        "affordability_status": affordability["status"],
        "shortfall": affordability["shortfall"],
        "surplus_after_goal": affordability["surplus_after_goal"],
    }


def _months_until(deadline):
    today = date.today()
    months = (deadline.year - today.year) * 12 + deadline.month - today.month
    if deadline.day > today.day:
        months += 1
    return max(months, 1)


def _to_float(value):
    if isinstance(value, Decimal):
        return float(value)
    return float(value or 0)
