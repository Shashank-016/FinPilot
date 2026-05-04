from sqlalchemy import Column, String, Numeric, Date, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from sqlalchemy.sql import func

class Goal(Base):
    __tablename__ = "goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    name = Column(String, nullable=False)
    target_amount = Column(Numeric(12,2), nullable=False)
    current_amount = Column(Numeric(12,2), default=0)

    start_date = Column(Date)
    deadline = Column(Date)

    created_at = Column(TIMESTAMP, server_default=func.now())