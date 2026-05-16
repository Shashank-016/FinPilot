from sqlalchemy import Boolean, Column, String, Numeric, Date, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from sqlalchemy.sql import func
import uuid

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    amount = Column(Numeric(10,2), nullable=False)
    type = Column(String, nullable=False)

    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"))
    description = Column(String)

    transaction_date = Column(Date, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Email ingestion fields
    source = Column(String, nullable=True)        # "email" | "csv" | None (manual)
    email_uid = Column(String, nullable=True, unique=True)  # IMAP UID for dedup
    needs_review = Column(Boolean, default=False, nullable=False)
    transaction_time = Column(String, nullable=True)  # "HH:MM" extracted from email body