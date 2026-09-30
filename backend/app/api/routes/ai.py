from fastapi import APIRouter, Depends, HTTPException
from app.api.dependencies import get_current_user
from app.models.user import User
from app.workers.tasks import extract_clauses, score_risk
from app.models.clause import Clause
from app.models.contract import Contract
from app.models.playbook_rule import PlaybookRule
from app.models.redline import Redline
from app.models.enums import RedlineStatus
from app.services.ai import generate_contract_summary, generate_redline, get_embedding, compare_versions_llm
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from sqlalchemy import select
from sqlalchemy import text as sql_text
from app.workers.tasks import extract_dates
from app.services.ai import generate_redline, get_embedding, compare_versions_llm, answer_contract_question
from app.services.audit import log_action



router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/extract-clauses")
async def trigger_extract_clauses(
    contract_id: str,
    current_user: User = Depends(get_current_user),
):
    extract_clauses.delay(contract_id)
    return {"status": "extraction started", "contract_id": contract_id}


@router.post("/score-risk")
async def trigger_score_risk(
    contract_id: str,
    current_user: User = Depends(get_current_user),
):
    score_risk.delay(contract_id)
    return {"status": "scoring started", "contract_id": contract_id}

@router.post("/redline")
async def suggest_redline(
    clause_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Clause).where(Clause.id == clause_id))
    clause = result.scalar_one_or_none()
    if not clause:
        raise HTTPException(status_code=404, detail="Clause not found")

    result = await db.execute(select(PlaybookRule).where(PlaybookRule.clause_type == clause.clause_type))
    playbook_rule = result.scalar_one_or_none()
    if not playbook_rule:
        raise HTTPException(status_code=400, detail="No playbook rule for this clause type")

    ai_output = generate_redline(clause.text, clause.clause_type, playbook_rule.standard_language)

    redline = Redline(
        clause_id=clause.id,
        suggested_text=ai_output["suggested_text"],
        rationale=ai_output["rationale"],
        status=RedlineStatus.pending,
    )
    db.add(redline)
    await db.commit()
    await db.refresh(redline)

    return {
        "id": str(redline.id),
        "suggested_text": redline.suggested_text,
        "rationale": redline.rationale,
        "status": redline.status.value,
    }


@router.get("/redline/{clause_id}")
async def get_redlines_for_clause(
    clause_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Redline).where(Redline.clause_id == clause_id))
    redlines = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "suggested_text": r.suggested_text,
            "rationale": r.rationale,
            "status": r.status.value,
        }
        for r in redlines
    ]


@router.put("/redline/{redline_id}")
async def update_redline_status(
    redline_id: str,
    status: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Redline).where(Redline.id == redline_id))
    redline = result.scalar_one_or_none()
    if not redline:
        raise HTTPException(status_code=404, detail="Redline not found")

    redline.status = RedlineStatus(status)
    await db.commit()

    clause_result = await db.execute(
        select(Clause).where(Clause.id == redline.clause_id)
    )
    clause = clause_result.scalar_one_or_none()
    if not clause:
        raise HTTPException(status_code=404, detail="Associated clause not found")

    await log_action(
        db, str(clause.contract_id), str(current_user.id), f"redline_{status}"
    )
    return {"status": "updated"}


@router.post("/compare-versions")
async def compare_versions(
    version_a_id: str,
    version_b_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result_a = await db.execute(select(Contract).where(Contract.id == version_a_id))
    contract_a = result_a.scalar_one_or_none()
    result_b = await db.execute(select(Contract).where(Contract.id == version_b_id))
    contract_b = result_b.scalar_one_or_none()

    if not contract_a or not contract_b:
        raise HTTPException(status_code=404, detail="One or both versions not found")
    if not contract_a.raw_text or not contract_b.raw_text:
        raise HTTPException(status_code=400, detail="Both versions must be parsed first")

    changes = compare_versions_llm(contract_a.raw_text, contract_b.raw_text)
    return {"changes": changes}


@router.post("/extract-dates")
async def trigger_extract_dates(
    contract_id: str,
    current_user: User = Depends(get_current_user),
):
    extract_dates.delay(contract_id)
    return {"status": "extraction started"}

@router.post("/search-contracts")
async def search_contracts(
    query: str,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query_embedding = get_embedding(query)

    # rank every clause across the whole repository by similarity to the query,
    # join back to its contract for title/id — pgvector's <=> does the heavy lifting
    result = await db.execute(
        sql_text("""
            SELECT
                c.id AS clause_id,
                c.clause_type,
                c.text AS clause_text,
                c.section_ref,
                ct.id AS contract_id,
                ct.title AS contract_title,
                ct.counterparty,
                (c.embedding <=> (:query_emb)::vector) AS distance
            FROM clauses c
            JOIN contracts ct ON c.contract_id = ct.id
            WHERE c.embedding IS NOT NULL
            ORDER BY distance ASC
            LIMIT :limit
        """),
        {"query_emb": str(query_embedding), "limit": limit},
    )
    rows = result.mappings().all()

    return [
        {
            "contract_id": str(row["contract_id"]),
            "contract_title": row["contract_title"],
            "counterparty": row["counterparty"],
            "clause_id": str(row["clause_id"]),
            "clause_type": row["clause_type"],
            "section_ref": row["section_ref"],
            "snippet": row["clause_text"][:200],
            "relevance": round(1 - row["distance"], 3),  # convert distance to a 0-1 "similarity" for display
        }
        for row in rows
    ]

@router.post("/chat")
async def contract_qa(
    contract_id: str,
    question: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query_embedding = get_embedding(question)

    # retrieve top 5 most relevant clauses from THIS contract only — same
    # pattern as UC10's repo-wide search, just scoped with a WHERE clause
    result = await db.execute(
        sql_text("""
            SELECT id, clause_type, text, section_ref,
                   (embedding <=> (:query_emb)::vector) AS distance
            FROM clauses
            WHERE contract_id = (:contract_id)::uuid AND embedding IS NOT NULL
            ORDER BY distance ASC
            LIMIT 5
        """),
        {"query_emb": str(query_embedding), "contract_id": contract_id},
    )
    rows = result.mappings().all()

    if not rows:
        return {"answer": "This contract hasn't been processed yet — no clauses available to search.", "sources": []}

    context_chunks = [dict(r) for r in rows]
    answer = answer_contract_question(question, context_chunks)

    return {
        "answer": answer,
        "sources": [
            {"clause_id": str(r["id"]), "clause_type": r["clause_type"], "section_ref": r["section_ref"]}
            for r in rows
        ],
    }

@router.post("/summarize")
async def summarize_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if not contract.raw_text:
        raise HTTPException(status_code=400, detail="Contract must be parsed first")

    summary = generate_contract_summary(contract.raw_text)
    contract.summary = summary
    await db.commit()

    return {"summary": summary}

from app.models.compliance_flag import ComplianceFlag
from app.services.ai import compliance_check_llm

@router.post("/compliance-check")
async def compliance_check(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract or not contract.raw_text:
        raise HTTPException(status_code=400, detail="Contract must be parsed first")

    # clear previous flags before inserting fresh ones — same idempotency
    # fix as extract_dates, avoid duplicate accumulation on re-run
    await db.execute(
        sql_text("DELETE FROM compliance_flags WHERE contract_id = (:cid)::uuid"),
        {"cid": contract_id},
    )

    flags = compliance_check_llm(contract.raw_text)

    for f in flags:
        flag = ComplianceFlag(
            contract_id=contract.id,
            regulation_reference=f["regulation_reference"],
            flag_reason=f["flag_reason"],
            severity=f["severity"],
        )
        db.add(flag)

    await db.commit()
    return {"flags_found": len(flags)}


@router.get("/compliance-flags/{contract_id}")
async def get_compliance_flags(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ComplianceFlag).where(ComplianceFlag.contract_id == contract_id))
    flags = result.scalars().all()
    return [
        {
            "id": str(f.id),
            "regulation_reference": f.regulation_reference,
            "flag_reason": f.flag_reason,
            "severity": f.severity,
        }
        for f in flags
    ]