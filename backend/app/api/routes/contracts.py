import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.contract import Contract
from app.models.user import User
from app.workers.tasks import parse_contract

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

    # enqueue background parsing — don't block the upload response
    parse_contract.delay(str(contract.id))

    return {"id": str(contract.id), "status": contract.status.value}


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
        "status": contract.status.value,
        "created_at": contract.created_at,
    }