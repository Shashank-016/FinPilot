from uuid import UUID

from sqlalchemy.orm import Session

from app.models.budget import Budget


def get_budgets_by_user(db: Session, user_id: UUID) -> list[Budget]:
    return db.query(Budget).filter(Budget.user_id == user_id).all()


def get_budget(db: Session, user_id: UUID, category_name: str) -> Budget | None:
    return (
        db.query(Budget)
        .filter(Budget.user_id == user_id, Budget.category_name == category_name)
        .first()
    )


def upsert_budget(db: Session, user_id: UUID, category_name: str, monthly_limit: float) -> Budget:
    budget = get_budget(db, user_id, category_name)
    if budget:
        budget.monthly_limit = monthly_limit
    else:
        budget = Budget(user_id=user_id, category_name=category_name, monthly_limit=monthly_limit)
        db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


def delete_budget(db: Session, user_id: UUID, category_name: str) -> bool:
    budget = get_budget(db, user_id, category_name)
    if not budget:
        return False
    db.delete(budget)
    db.commit()
    return True
