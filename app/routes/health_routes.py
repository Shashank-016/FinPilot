from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("select 1"))
    return {"status": "ok", "database": "ok"}


@router.get("/admin/email-diagnose")
def email_diagnose():
    from app.config import IMAP_EMAIL, IMAP_HOST, IMAP_PASSWORD
    from app.services.email_fetcher import IMAPEmailFetcher
    fetcher = IMAPEmailFetcher(host=IMAP_HOST, email_address=IMAP_EMAIL, password=IMAP_PASSWORD)
    return fetcher.diagnose()
