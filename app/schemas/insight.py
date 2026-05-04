from datetime import datetime
from typing import Dict, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

InsightType = Literal[
    "spending_summary",
    "goal_progress",
    "goal_gap",
    "article_recommendation",
]
InsightSeverity = Literal["info", "success", "warning", "critical"]


class InsightCreate(BaseModel):
    user_id: UUID
    goal_id: Optional[UUID] = None
    type: InsightType
    title: str
    message: str
    severity: InsightSeverity = "info"
    context: Optional[Dict] = None


class InsightResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    goal_id: Optional[UUID] = None
    type: str
    title: str
    message: str
    severity: str
    context: Optional[Dict]
    created_at: datetime


class GenerateInsightsResponse(BaseModel):
    generated: int
    insights: list[InsightResponse]
