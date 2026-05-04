from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import date, datetime
from typing import Optional


class GoalCreate(BaseModel):
    user_id: UUID
    name: str
    target_amount: float = Field(gt=0)
    current_amount: float = Field(default=0, ge=0)
    start_date: Optional[date] = None
    deadline: Optional[date] = None


class GoalUpdate(BaseModel):
    current_amount: float = Field(ge=0)


class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    name: str
    target_amount: float
    current_amount: float
    start_date: Optional[date]
    deadline: Optional[date]
    created_at: datetime
