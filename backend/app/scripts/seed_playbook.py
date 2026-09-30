from app.db.sync_session import SyncSessionLocal
from app.models.playbook_rule import PlaybookRule
from app.services.ai import CLAUSE_TYPES, get_embedding

# One representative "standard/acceptable" clause per type.
# Real firms would pull this from their actual template library —
# for this project, reasonable boilerplate is fine.
STANDARD_LANGUAGE = {
    "termination": "Either party may terminate this Agreement upon thirty (30) days written notice to the other party, without cause. Either party may terminate immediately upon material breach that remains uncured after fifteen (15) days written notice.",
    "liability": "Neither party's liability arising out of this Agreement shall exceed the total fees paid under this Agreement in the twelve (12) months preceding the claim.",
    "indemnification": "Each party shall indemnify and hold harmless the other party from third-party claims arising from its own gross negligence or willful misconduct.",
    "confidentiality": "Each party agrees to maintain the confidentiality of the other party's proprietary information and to use such information solely for the purposes of this Agreement, for a period of three (3) years following termination.",
    "payment_terms": "Payment shall be due within thirty (30) days of invoice receipt. Late payments accrue interest at 1.5% per month.",
    "governing_law": "This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of law principles.",
    "assignment": "Neither party may assign this Agreement without the prior written consent of the other party, except in connection with a merger, acquisition, or sale of substantially all assets.",
    "force_majeure": "Neither party shall be liable for delay or failure to perform due to causes beyond its reasonable control, including natural disasters, war, or governmental action.",
    "dispute_resolution": "Any dispute arising under this Agreement shall first be addressed through good-faith negotiation, and if unresolved within thirty (30) days, submitted to binding arbitration.",
    "limitation_of_liability": "In no event shall either party be liable for indirect, incidental, special, or consequential damages, even if advised of the possibility of such damages.",
}


def seed():
    db = SyncSessionLocal()
    try:
        for clause_type in CLAUSE_TYPES:
            existing = db.query(PlaybookRule).filter(
                PlaybookRule.clause_type == clause_type
            ).first()
            if existing:
                print(f"Skipping {clause_type} — already seeded")
                continue

            language = STANDARD_LANGUAGE.get(clause_type, "")
            embedding = get_embedding(language) if language else None

            rule = PlaybookRule(
                clause_type=clause_type,
                standard_language=language,
                embedding=embedding,
                risk_threshold=0.75,
                updated_by=None,  # or a seeded admin user id if your FK requires it
            )
            db.add(rule)
            print(f"Seeded {clause_type}")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()