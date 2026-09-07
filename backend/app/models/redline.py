import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.enums import RedlineStatus


class Redline(Base):
    __tablename__ = "redlines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clause_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clauses.id"), nullable=False)

    suggested_text: Mapped[str] = mapped_column(String, nullable=False)
    rationale: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[RedlineStatus] = mapped_column(Enum(RedlineStatus), default=RedlineStatus.pending)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)