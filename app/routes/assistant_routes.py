from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.assistant import AssistantSnapshotResponse
from app.services.assistant_service import get_assistant_snapshot

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.get("/snapshot/{user_id}", response_model=AssistantSnapshotResponse)
def get_assistant_snapshot_api(user_id: UUID, db: Session = Depends(get_db)):
    return get_assistant_snapshot(db, user_id)
