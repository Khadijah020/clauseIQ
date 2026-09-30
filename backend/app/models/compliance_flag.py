import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ComplianceFlag(Base):
    __tablename__ = "compliance_flags"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    clause_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("clauses.id"), nullable=True)

    regulation_reference: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "GDPR Art. 28"
    flag_reason: Mapped[str] = mapped_column(String, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)  # low/medium/high

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)