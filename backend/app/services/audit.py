from app.models.audit_log import AuditLog


async def log_action(db, contract_id: str, user_id: str, action: str, meta: dict | None = None):
    entry = AuditLog(contract_id=contract_id, user_id=user_id, action=action, meta=meta)
    db.add(entry)
    await db.commit()