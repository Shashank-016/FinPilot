from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.cashflow import CashflowSummary
from app.services.cashflow_service import get_user_cashflow

router = APIRouter(prefix="/cashflow", tags=["cashflow"])


@router.get("/user/{user_id}", response_model=CashflowSummary)
def get_user_cashflow_api(
    user_id: UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    return get_user_cashflow(db, user_id, start_date, end_date)
