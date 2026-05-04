from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.insight import GenerateInsightsResponse, InsightResponse
from app.services.insight_service import generate_user_insights, list_user_insights

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/user/{user_id}", response_model=list[InsightResponse])
def get_user_insights(user_id: UUID, db: Session = Depends(get_db)):
    return list_user_insights(db, user_id)


@router.post("/generate/{user_id}", response_model=GenerateInsightsResponse)
def generate_insights_api(user_id: UUID, db: Session = Depends(get_db)):
    insights = generate_user_insights(db, user_id)
    return {"generated": len(insights), "insights": insights}
