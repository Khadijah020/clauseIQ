import uuid
from datetime import date, datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.enums import ObligationType


class Obligation(Base):
    __tablename__ = "obligations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)

    obligation_type: Mapped[ObligationType] = mapped_column(Enum(ObligationType), nullable=False)
    # app/models/obligation.py
    due_date: Mapped[date | None] = mapped_column(nullable=True)
    period_description: Mapped[str | None] = mapped_column(nullable=True)  # e.g. "5 days after invoice"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)