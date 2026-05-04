from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Literal


class CategoryCreate(BaseModel):
    name: str
    type: Literal["income", "expense"]


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    type: Literal["income", "expense"]
    created_at: datetime
