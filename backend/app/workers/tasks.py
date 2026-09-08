import pdfplumber
import pytesseract
from pdf2image import convert_from_path

from app.db.sync_session import SyncSessionLocal
from app.models.contract import Contract
from app.models.enums import ContractStatus
from app.workers.celery_app import celery_app


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
    except Exception as e:
        contract.status = ContractStatus.processing  # or add a "failed" status
        db.commit()
        raise e
    finally:
        db.close()