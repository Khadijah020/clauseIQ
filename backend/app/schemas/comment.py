from pydantic import BaseModel

class CommentCreate(BaseModel):
    text: str
    escalated: bool = False