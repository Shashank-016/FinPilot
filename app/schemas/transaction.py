from datetime import date, datetime
from typing import Literal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TransactionCreate(BaseModel):
    user_id: UUID
    amount: float = Field(gt=0)
    type: Literal["income", "expense"]
    category_id: Optional[UUID] = None
    description: Optional[str] = None
    transaction_date: date


class TransactionUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    type: Optional[Literal["income", "expense"]] = None
    category_id: Optional[UUID] = None
    description: Optional[str] = None
    transaction_date: Optional[date] = None


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    amount: float
    type: str
    category_id: Optional[UUID] = None
    description: Optional[str] = None
    transaction_date: date
    created_at: datetime


class CategorySummaryItem(BaseModel):
    category: str
    type: str
    total: float


class UploadTransactionsResponse(BaseModel):
    message: str
    filename: str
    inserted: int
