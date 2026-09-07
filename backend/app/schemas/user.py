from pydantic import BaseModel, EmailStr
from typing import Literal

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Literal["business_user", "legal_reviewer", "admin"]


class UserLogin(BaseModel):
    email: EmailStr
    password: str