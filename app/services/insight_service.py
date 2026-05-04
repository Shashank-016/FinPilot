from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func

from app.models.category import Category
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.repositories.insight_repo import get_insights_by_user, replace_insights_for_user
from app.services.cashflow_service import assess_goal_affordability, get_user_cashflow


def list_user_insights(db, user_id: UUID):
    return get_insights_by_user(db, user_id)


def generate_user_insights(db, user_id: UUID):
    insight_payloads = []
    insight_payloads.extend(_build_spending_insights(db, user_id))
    insight_payloads.extend(_build_goal_insights(db, user_id))

    if not insight_payloads:
        insight_payloads.append(
            {
                "user_id": user_id,
                "type": "spending_summary",
                "title": "No financial activity yet",
                "message": "Add transactions and goals to start receiving personalized financial insights.",
                "severity": "info",
                "context": {"reason": "no_transactions_or_goals"},
            }
        )

    return replace_insights_for_user(db, user_id, insight_payloads)


def _build_spending_insights(db, user_id: UUID):
    category_totals = (
        db.query(
            Category.name.label("category"),
            func.sum(Transaction.amount).label("total"),
        )
        .join(Category, Transaction.category_id == Category.id, isouter=True)
        .filter(Transaction.user_id == user_id, Transaction.type == "expense")
        .group_by(Category.name)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )

    if not category_totals:
        return []

    top = category_totals[0]
    category = top.category or "uncategorized"
    total = _to_float(top.total)
    total_expense = sum(_to_float(row.total) for row in category_totals)
    share = round((total / total_expense) * 100, 2) if total_expense else 0

    return [
        {
            "user_id": user_id,
            "type": "spending_summary",
            "title": f"Your top spending category is {category}",
            "message": (
                f"You have spent {total:.2f} on {category}, which is {share:.2f}% "
                "of your tracked expenses."
            ),
            "severity": "info" if share < 40 else "warning",
            "context": {
                "category": category,
                "category_total": total,
                "total_expense": total_expense,
                "share_percent": share,
            },
        },
        {
            "user_id": user_id,
            "type": "article_recommendation",
            "title": f"Recommended reading: managing {category} spending",
            "message": (
                f"Because {category} is your largest spending category, curated articles "
                "about budgeting this area would be useful."
            ),
            "severity": "info",
            "context": {
                "topic": f"{category} budgeting",
                "reason": "top_spending_category",
            },
        },
    ]


def _build_goal_insights(db, user_id: UUID):
    goals = db.query(Goal).filter(Goal.user_id == user_id).all()
    insights = []
    cashflow = get_user_cashflow(db, user_id)
    monthly_surplus = cashflow["surplus"]

    for goal in goals:
        target = _to_float(goal.target_amount)
        current = _to_float(goal.current_amount)
        remaining = max(target - current, 0)
        progress_percent = round((current / target) * 100, 2) if target else 0
        severity = "success" if progress_percent >= 100 else "info"

        insights.append(
            {
                "user_id": user_id,
                "goal_id": goal.id,
                "type": "goal_progress",
                "title": f"{goal.name} is {progress_percent:.2f}% funded",
                "message": (
                    f"You have saved {current:.2f} out of {target:.2f}. "
                    f"{remaining:.2f} remains."
                ),
                "severity": severity,
                "context": {
                    "goal_name": goal.name,
                    "target_amount": target,
                    "current_amount": current,
                    "remaining_amount": remaining,
                    "progress_percent": progress_percent,
                },
            }
        )

        if goal.deadline and remaining > 0:
            months_left = _months_until(goal.deadline)
            monthly_required = round(remaining / months_left, 2) if months_left else remaining
            affordability = assess_goal_affordability(monthly_surplus, monthly_required)
            insights.append(
                {
                    "user_id": user_id,
                    "goal_id": goal.id,
                    "type": "goal_gap",
                    "title": _goal_gap_title(goal.name, affordability["status"]),
                    "message": _goal_gap_message(goal.name, goal.deadline, monthly_required, monthly_surplus, affordability),
                    "severity": _goal_gap_severity(affordability["status"], months_left),
                    "context": {
                        "goal_name": goal.name,
                        "remaining_amount": remaining,
                        "deadline": goal.deadline.isoformat(),
                        "months_left": months_left,
                        "monthly_required": monthly_required,
                        "monthly_surplus": monthly_surplus,
                        "affordability_status": affordability["status"],
                        "shortfall": affordability["shortfall"],
                        "surplus_after_goal": affordability["surplus_after_goal"],
                    },
                }
            )

    return insights


def _goal_gap_title(goal_name: str, status: str):
    if status == "on_track":
        return f"{goal_name} looks affordable"
    if status == "tight":
        return f"{goal_name} is possible but tight"
    if status == "achieved":
        return f"{goal_name} is already funded"
    return f"{goal_name} is not on track yet"


def _goal_gap_message(goal_name: str, deadline, monthly_required: float, monthly_surplus: float, affordability: dict):
    if affordability["status"] == "on_track":
        return (
            f"To reach {goal_name} by {deadline.isoformat()}, you need about {monthly_required:.2f} "
            f"per month. Your tracked surplus is {monthly_surplus:.2f}, so this goal is currently on track."
        )
    if affordability["status"] == "tight":
        return (
            f"{goal_name} needs about {monthly_required:.2f} per month by {deadline.isoformat()}. "
            f"Your tracked surplus is {monthly_surplus:.2f}, leaving little room for surprises."
        )
    return (
        f"{goal_name} needs about {monthly_required:.2f} per month by {deadline.isoformat()}, "
        f"but your tracked surplus is {monthly_surplus:.2f}. You are short by "
        f"{affordability['shortfall']:.2f} per month."
    )


def _goal_gap_severity(status: str, months_left: int):
    if status == "not_on_track":
        return "critical" if months_left <= 3 else "warning"
    if status == "tight":
        return "warning"
    return "success"


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
