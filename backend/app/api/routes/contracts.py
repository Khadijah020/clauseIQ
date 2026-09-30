import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.redline import Redline
from app.models.clause import Clause
from app.api.dependencies import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.contract import Contract
from app.models.user import User
from app.workers.tasks import parse_contract
from app.models.obligation import Obligation
from app.models.contract import ContractStatus
from app.models.notification import Notification
from app.services.notifications import publish_notification_sync
from app.services.audit import log_action
from app.models.audit_log import AuditLog
from fastapi import Form
from typing import List


router = APIRouter(prefix="/api/contracts", tags=["contracts"])


@router.post("")
async def upload_contract(
    title: str = Form(...),
    counterparty: str = Form(...),
    contract_type: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # PDF-only validation — extension + content-type, since either can be spoofed alone
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    os.makedirs(settings.upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.upload_dir, unique_name)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    contract = Contract(
        title=title,
        counterparty=counterparty,
        contract_type=contract_type,
        file_path=file_path,
        uploaded_by=current_user.id,
    )
    db.add(contract)
    await db.commit()
    await db.refresh(contract)
    await log_action(db, str(contract.id), str(current_user.id), "upload")

    # enqueue background parsing — don't block the upload response
    parse_contract.delay(str(contract.id))

    return {"id": str(contract.id), "status": contract.status.value}


@router.get("")
async def list_contracts(
    status: str | None = Query(None),
    sort: str | None = Query(None),
    mine: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Contract)

    if mine:
        query = query.where(Contract.uploaded_by == current_user.id)

    if status:
        query = query.where(Contract.status == status)

    if sort == "risk_score":
        query = query.order_by(Contract.risk_score.desc().nulls_last())
    else:
        query = query.order_by(Contract.created_at.desc())

    result = await db.execute(query)
    contracts = result.scalars().all()

    return [
        {
            "id": str(c.id),
            "title": c.title,
            "counterparty": c.counterparty,
            "status": c.status.value,
            "risk_score": c.risk_score,
            "created_at": c.created_at,
        }
        for c in contracts
    ]

@router.get("/{contract_id}")
async def get_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    return {
        "id": str(contract.id),
        "title": contract.title,
        "counterparty": contract.counterparty,
        "status": contract.status.value,
        "risk_score": contract.risk_score,
        "created_at": contract.created_at,
        "summary": contract.summary,
    }



@router.post("/{contract_id}/versions")
async def upload_new_version(
    contract_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent contract not found")

    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.upload_dir, unique_name)
    with open(file_path, "wb") as f:
        f.write(await file.read())

    new_version = Contract(
        title=parent.title,
        counterparty=parent.counterparty,
        contract_type=parent.contract_type,
        file_path=file_path,
        uploaded_by=current_user.id,
        parent_contract_id=parent.id,
        version=parent.version + 1,
    )
    db.add(new_version)
    await db.commit()
    await db.refresh(new_version)

    parse_contract.delay(str(new_version.id))  # runs the same pipeline as a fresh upload

    return {"id": str(new_version.id), "version": new_version.version}


@router.get("/{contract_id}/versions")
async def list_versions(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # find the root contract (walk up if this id is itself a version)
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    root_id = contract.parent_contract_id or contract.id

    result = await db.execute(
        select(Contract).where(
            (Contract.id == root_id) | (Contract.parent_contract_id == root_id)
        ).order_by(Contract.version)
    )
    versions = result.scalars().all()
    return [{"id": str(v.id), "version": v.version, "title": v.title} for v in versions]


@router.get("/obligations/all")
async def list_all_obligations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Obligation, Contract.title).join(Contract, Obligation.contract_id == Contract.id)
    )
    rows = result.all()
    return [
        {
            "id": str(o.id),
            "contract_title": title,
            "obligation_type": o.obligation_type.value,
            "due_date": o.due_date.isoformat() if o.due_date else None,
            "period_description": o.period_description,
        }
        for o, title in rows
    ]

@router.get("/{contract_id}/redlines")
async def list_contract_redlines(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Redline, Clause)
        .join(Clause, Redline.clause_id == Clause.id)
        .where(Clause.contract_id == contract_id)
    )
    rows = result.all()

    return [
        {
            "redline_id": str(redline.id),
            "clause_id": str(clause.id),
            "clause_type": clause.clause_type,
            "original_text": clause.text,
            "suggested_text": redline.suggested_text,
            "rationale": redline.rationale,
            "status": redline.status.value,
        }
        for redline, clause in rows
    ]

@router.post("/bulk")
async def bulk_upload(
    files: List[UploadFile] = File(...),
    contract_type: str = Form(...),
    assigned_reviewer_id: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    created_ids = []
    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            continue  # skip non-PDFs silently rather than failing the whole batch

        os.makedirs(settings.upload_dir, exist_ok=True)
        ext = os.path.splitext(file.filename)[1]
        unique_name = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(settings.upload_dir, unique_name)
        with open(file_path, "wb") as f:
            f.write(await file.read())

        contract = Contract(
            title=file.filename,
            counterparty="TBD",
            contract_type=contract_type,
            file_path=file_path,
            uploaded_by=current_user.id,
        )
        db.add(contract)
        await db.commit()
        await db.refresh(contract)

        parse_contract.delay(str(contract.id))
        created_ids.append(str(contract.id))

    return {"contracts_queued": len(created_ids), "contract_ids": created_ids}

@router.get("/bulk/report")
async def bulk_batch_report(
    contract_ids: str,  # comma-separated ids, passed as query param
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ids = contract_ids.split(",")
    result = await db.execute(select(Contract).where(Contract.id.in_(ids)))
    contracts = result.scalars().all()

    scored = [c for c in contracts if c.risk_score is not None]
    avg_risk = sum(c.risk_score for c in scored) / len(scored) if scored else None
    high_risk_count = len([c for c in scored if c.risk_score >= 7])

    return {
        "total": len(contracts),
        "processed": len(scored),
        "average_risk": round(avg_risk, 1) if avg_risk else None,
        "flagged_high_risk": high_risk_count,
        "contracts": [{"id": str(c.id), "title": c.title, "status": c.status.value, "risk_score": c.risk_score} for c in contracts],
    }



@router.get("/{contract_id}/clauses")
async def list_clauses(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Clause).where(Clause.contract_id == contract_id))
    clauses = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "clause_type": c.clause_type,
            "text": c.text,
            "section_ref": c.section_ref,
            "risk_level": c.risk_level,
            "deviation_reason": c.deviation_reason,
        }
        for c in clauses
    ]

@router.put("/{contract_id}/status")
async def update_contract_status(
    contract_id: str,
    status: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    contract.status = ContractStatus(status)
    await db.commit()
    await log_action(
    db,
    contract_id,
    str(current_user.id),
    f"status_changed_to_{status}"
        )

    notif = Notification(
        user_id=contract.uploaded_by,
        event_type="review_completed",
        message=f'"{contract.title}" review completed — status: {status}',
        )
    db.add(notif)
    await db.commit()
    publish_notification_sync(str(contract.uploaded_by), "review_completed", notif.message)
    return {"status": contract.status.value}

from app.models.audit_log import AuditLog

@router.get("/{contract_id}/audit")
async def get_audit_trail(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(AuditLog, User.email)
        .join(User, AuditLog.user_id == User.id)
        .where(AuditLog.contract_id == contract_id)
        .order_by(AuditLog.timestamp.desc())
    )
    rows = result.all()
    return [
        {"id": str(log.id), "action": log.action, "user_email": email, "timestamp": log.timestamp}
        for log, email in rows
    ]



