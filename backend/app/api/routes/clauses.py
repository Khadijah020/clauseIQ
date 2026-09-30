from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.models.clause import Clause
from app.models.comment import Comment
from app.models.user import User
from app.schemas.comment import CommentCreate
from app.services.audit import log_action


router = APIRouter(prefix="/api/clauses", tags=["clauses"])


@router.get("/{clause_id}")
async def get_clause(
    clause_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Clause).where(Clause.id == clause_id))
    clause = result.scalar_one_or_none()
    if not clause:
        raise HTTPException(status_code=404, detail="Clause not found")

    return {
        "id": str(clause.id),
        "contract_id": str(clause.contract_id),
        "clause_type": clause.clause_type,
        "text": clause.text,
        "section_ref": clause.section_ref,
        "risk_level": clause.risk_level,
        "deviation_reason": clause.deviation_reason,
        "confidence": clause.confidence,
    }


@router.get("/{clause_id}/comments")
async def list_comments(
    clause_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Comment).where(Comment.clause_id == clause_id))
    comments = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "text": c.text,
            "escalated": c.escalated,
            "created_at": c.created_at,
        }
        for c in comments
    ]


@router.post("/{clause_id}/comments")
async def add_comment(
    clause_id: str,
    payload: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = Comment(
        clause_id=clause_id,
        user_id=current_user.id,
        text=payload.text,
        escalated=payload.escalated,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return {"id": str(comment.id), "status": "added"}