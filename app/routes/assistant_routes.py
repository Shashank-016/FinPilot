import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.database import get_db
from app.schemas.assistant import AssistantSnapshotResponse
from app.schemas.chat import ChatRequest
from app.services.assistant_service import get_assistant_snapshot
from app.services.chat_service import stream_chat

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.get("/snapshot/{user_id}", response_model=AssistantSnapshotResponse)
def get_assistant_snapshot_api(user_id: UUID, db: Session = Depends(get_db)):
    return get_assistant_snapshot(db, user_id)


@router.post("/chat")
def chat_endpoint(body: ChatRequest, db: Session = Depends(get_db)):
    def generate():
        try:
            for chunk in stream_chat(
                db,
                body.user_id,
                body.message,
                [m.model_dump() for m in body.history],
            ):
                yield f"data: {json.dumps({'text': chunk})}\n\n"
        except Exception as exc:
            logger.error("Chat stream error: %s", exc, exc_info=True)
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
