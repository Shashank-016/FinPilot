from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.goal import GoalCreate, GoalResponse, GoalUpdate
from app.services.goal_service import add_goal, list_user_goals, set_goal_progress

router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("", response_model=GoalResponse)
def create_goal_api(data: GoalCreate, db: Session = Depends(get_db)):
    return add_goal(db, data.model_dump())


@router.get("/user/{user_id}", response_model=list[GoalResponse])
def get_user_goals(user_id: UUID, db: Session = Depends(get_db)):
    return list_user_goals(db, user_id)


@router.patch("/{goal_id}/progress", response_model=GoalResponse)
def update_goal_progress_api(
    goal_id: UUID,
    data: GoalUpdate,
    db: Session = Depends(get_db),
):
    return set_goal_progress(db, goal_id, data.current_amount)
