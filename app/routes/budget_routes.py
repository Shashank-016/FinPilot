from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.budget import BudgetResponse, BudgetSuggestion, BudgetUpsert
from app.services.budget_service import (
    get_budget_suggestions,
    list_budgets,
    remove_budget,
    set_budget,
)

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("/user/{user_id}", response_model=list[BudgetResponse])
def get_user_budgets(user_id: UUID, db: Session = Depends(get_db)):
    return list_budgets(db, user_id)


@router.post("", response_model=BudgetResponse)
def upsert_budget(data: BudgetUpsert, db: Session = Depends(get_db)):
    return set_budget(db, data.user_id, data.category_name, data.monthly_limit)


@router.delete("/user/{user_id}/category/{category_name}", status_code=204)
def delete_budget(user_id: UUID, category_name: str, db: Session = Depends(get_db)):
    found = remove_budget(db, user_id, category_name)
    if not found:
        raise HTTPException(status_code=404, detail="Budget not found")


@router.get("/suggest/{user_id}", response_model=list[BudgetSuggestion])
def suggest_budgets(user_id: UUID, db: Session = Depends(get_db)):
    return get_budget_suggestions(db, user_id)
