from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BudgetUpsert(BaseModel):
    user_id: UUID
    category_name: str
    monthly_limit: float = Field(gt=0)


class BudgetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    category_name: str
    monthly_limit: float
    created_at: datetime


class BudgetSuggestion(BaseModel):
    category_name: str
    suggested_limit: float
    based_on_months: int
