from app.models.playbook_rule import PlaybookRule
from app.services.ai import get_embedding
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.enums import UserRole 
from app.models.user import User

from app.api.dependencies import require_role

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/playbook")
async def list_playbook_rules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(PlaybookRule))
    rules = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "clause_type": r.clause_type,
            "standard_language": r.standard_language,
            "risk_threshold": r.risk_threshold,
        }
        for r in rules
    ]


@router.put("/playbook/{clause_type}")
async def update_playbook_rule(
    clause_type: str,
    payload: dict,  # or a proper Pydantic schema — see note below
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(PlaybookRule).where(PlaybookRule.clause_type == clause_type))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Playbook rule not found")

    if "standard_language" in payload:
        rule.standard_language = payload["standard_language"]
        rule.embedding = get_embedding(payload["standard_language"])  # re-embed on change
    if "risk_threshold" in payload:
        rule.risk_threshold = payload["risk_threshold"]

    rule.updated_by = current_user.id
    await db.commit()
    return {"status": "updated"}