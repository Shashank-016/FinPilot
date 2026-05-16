from typing import Literal
from pydantic import BaseModel


class ChatMessageItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    user_id: str
    message: str
    history: list[ChatMessageItem] = []
