import logging

import pdfplumber
import pytesseract
from pdf2image import convert_from_path
from sqlalchemy import text as sql_text

from app.db.sync_session import SyncSessionLocal
from app.models.clause import Clause
from app.models.contract import Contract
from app.models.enums import ContractStatus
from app.models.playbook_rule import PlaybookRule
from app.services.ai import extract_clauses_llm, get_embedding
from app.services.risk import cosine_distance_to_risk, compute_contract_risk_score
from app.workers.celery_app import celery_app
from datetime import date
from app.models.obligation import Obligation
from app.models.enums import ObligationType
from app.services.ai import extract_dates_llm
from app.services.notifications import publish_notification_sync
from app.models.notification import Notification as NotificationModel

logger = logging.getLogger(__name__)


def extract_text_pdfplumber(file_path: str) -> str:
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text += page_text + "\n"
    return text.strip()


def extract_text_ocr(file_path: str) -> str:
    images = convert_from_path(file_path)
    text = ""
    for image in images:
        text += pytesseract.image_to_string(image) + "\n"
    return text.strip()


@celery_app.task(name="parse_contract")
def parse_contract(contract_id: str):
    db = SyncSessionLocal()
    contract = None
    try:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            return

        text = extract_text_pdfplumber(contract.file_path)

        # near-empty text = likely a scanned image PDF, fall back to OCR
        if len(text) < 50:
            text = extract_text_ocr(contract.file_path)

        contract.raw_text = text
        contract.status = ContractStatus.parsed
        db.commit()
        # chain: kick off clause extraction now that parsing succeeded
        extract_clauses.delay(contract_id)

    except Exception:
        logger.exception(f"parse_contract failed for contract {contract_id}")
        db.rollback()  # clear any aborted transaction state before writing status
        if contract is not None:
            contract.status = ContractStatus.failed
            db.commit()
        raise
    finally:
        db.close()


@celery_app.task(name="extract_clauses")
def extract_clauses(contract_id: str):
    db = SyncSessionLocal()
    contract = None
    try:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract or not contract.raw_text:
            return

        clause_dicts = extract_clauses_llm(contract.raw_text)

        for c in clause_dicts:
            embedding = get_embedding(c["text"])
            clause = Clause(
                contract_id=contract.id,
                clause_type=c["clause_type"],
                text=c["text"],
                section_ref=c.get("section_ref"),
                embedding=embedding,
            )
            db.add(clause)

        db.commit()
        # chain: kick off risk scoring now that clauses + embeddings exist
        score_risk.delay(contract_id)

    except Exception:
        logger.exception(f"extract_clauses failed for contract {contract_id}")
        db.rollback()  # clear any aborted transaction state before writing status
        if contract is not None:
            contract.status = ContractStatus.failed
            db.commit()
        raise
    finally:
        db.close()


@celery_app.task(name="score_risk")
def score_risk(contract_id: str):
    db = SyncSessionLocal()
    contract = None
    try:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            return

        clauses = db.query(Clause).filter(Clause.contract_id == contract.id).all()
        risk_levels = []

        for clause in clauses:
            playbook_rule = db.query(PlaybookRule).filter(
                PlaybookRule.clause_type == clause.clause_type
            ).first()

            if not playbook_rule or playbook_rule.embedding is None or clause.embedding is None:
                continue  # no reference to compare against, skip scoring this clause

            if playbook_rule.clean_anchor is None or playbook_rule.aggressive_anchor is None:
                continue  # not yet calibrated for this clause type

            # pgvector's <=> operator computed directly in SQL — much faster
            # than pulling both vectors into Python and computing distance there.
            # Bind params are wrapped in parentheses before the ::vector cast —
            # without them, SQLAlchemy's parser chokes on ":name::type" syntax.
            result = db.execute(
                sql_text(
                    "SELECT (:clause_emb)::vector <=> (:rule_emb)::vector AS distance"
                ),
                {
                    "clause_emb": str(clause.embedding),
                    "rule_emb": str(playbook_rule.embedding),
                },
            ).first()
            distance = result.distance

            risk_level, deviation_reason = cosine_distance_to_risk(
                distance, playbook_rule.clean_anchor, playbook_rule.aggressive_anchor
            )

            clause.risk_level = risk_level
            clause.deviation_reason = deviation_reason
            risk_levels.append(risk_level)

        contract.risk_score = compute_contract_risk_score(risk_levels)
        contract.status = ContractStatus.pending_review  # per assignment's workflow spec
        db.commit()
        if contract.risk_score and contract.risk_score >= 7:
            notif = NotificationModel(
                user_id=contract.uploaded_by,
                event_type="high_risk_flag",
                message=f'"{contract.title}" was flagged high-risk (score: {contract.risk_score})',
            )
            db.add(notif)
            db.commit()
            publish_notification_sync(str(contract.uploaded_by), "high_risk_flag", notif.message)

    except Exception:
        logger.exception(f"score_risk failed for contract {contract_id}")
        db.rollback()  # clear any aborted transaction state before writing status
        if contract is not None:
            contract.status = ContractStatus.failed
            db.commit()
        raise
    finally:
        db.close()

# app/workers/tasks.py, inside extract_dates, before the insert loop
from app.models.obligation import Obligation

@celery_app.task(name="extract_dates")
def extract_dates(contract_id: str):
    db = SyncSessionLocal()
    contract = None
    try:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract or not contract.raw_text:
            return

        # clear any obligations from a previous run before inserting fresh ones
        db.query(Obligation).filter(Obligation.contract_id == contract.id).delete()

        obligation_dicts = extract_dates_llm(contract.raw_text)

        for o in obligation_dicts:
            due = None
            if o.get("due_date"):
                try:
                    due = date.fromisoformat(o["due_date"])
                except ValueError:
                    due = None

            obligation = Obligation(
                contract_id=contract.id,
                obligation_type=ObligationType(o["obligation_type"]),
                due_date=due,
                period_description=o.get("description") if due is None else None,
            )
            db.add(obligation)

        db.commit()

    except Exception:
        logger.exception(f"extract_dates failed for contract {contract_id}")
        db.rollback()
        raise
    finally:
        db.close()