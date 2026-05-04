from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class CategoryBreakdownItem(BaseModel):
    category: str
    total: float
    share_percent: float


class CashflowSummary(BaseModel):
    user_id: UUID
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    income: float
    expenses: float
    surplus: float
    savings_rate_percent: float
    expense_breakdown: list[CategoryBreakdownItem]
