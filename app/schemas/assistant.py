from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.schemas.cashflow import CashflowSummary
from app.schemas.goal import GoalResponse
from app.schemas.insight import InsightResponse


class GoalAffordabilitySnapshot(BaseModel):
    goal_id: UUID
    goal_name: str
    progress_percent: float
    remaining_amount: float
    months_left: Optional[int] = None
    monthly_required: Optional[float] = None
    monthly_surplus: float
    affordability_status: str
    shortfall: float
    surplus_after_goal: float


class AssistantSnapshotResponse(BaseModel):
    user_id: UUID
    generated_at: datetime
    cashflow: CashflowSummary
    goals: list[GoalResponse]
    goal_affordability: list[GoalAffordabilitySnapshot]
    insights: list[InsightResponse]
