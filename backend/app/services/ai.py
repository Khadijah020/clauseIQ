import json
import re
import time
from app.core.config import settings
import google.generativeai as genai  # type: ignore[import-not-found]
try:
    from google.api_core.exceptions import ResourceExhausted  # type: ignore[import-not-found]
except ImportError:
    class ResourceExhausted(Exception):
        """Fallback when google-api-core is unavailable during local analysis."""

        pass

from app.services.gemini_keys import key_pool

CLAUSE_TYPES = [
    "termination", "liability", "indemnification", "confidentiality",
    "payment_terms", "governing_law", "assignment", "force_majeure",
    "dispute_resolution", "limitation_of_liability",
]

EXTRACTION_PROMPT = """You are a legal contract analysis assistant. Given the contract text below, identify and extract every clause that matches one of these types:

{clause_types}

For each clause found, return an object with:
- "clause_type": one of the types above (exact match)
- "text": the full text of the clause, verbatim from the contract
- "section_ref": the section/clause number or heading if present, otherwise null

Return ONLY a JSON array, no markdown formatting, no explanation. If no clauses of a type exist, omit that type. Example format:
[{{"clause_type": "termination", "text": "...", "section_ref": "Section 8"}}]

Contract text:
{contract_text}
"""

def _call_with_key_rotation(fn, max_attempts: int = None):
    """Tries the call across all available keys before giving up.
    fn takes no args and should configure/use genai internally per-attempt."""
    keys = key_pool.all_keys()
    max_attempts = max_attempts or len(keys)

    last_error = None
    for attempt in range(max_attempts):
        key = key_pool.next_key()
        genai.configure(api_key=key)
        
        try:
            return fn()
        except ResourceExhausted as e:
            # this specific key hit its rate/quota limit — try the next one
            last_error = e
            time.sleep(1)  # brief backoff before switching keys
            continue

    raise last_error


def extract_clauses_llm(raw_text: str) -> list[dict]:
    def call():
        model = genai.GenerativeModel("gemini-3.6-flash")
        prompt = EXTRACTION_PROMPT.format(
            clause_types=", ".join(CLAUSE_TYPES),
            contract_text=raw_text[:30000],
        )
        response = model.generate_content(prompt)
        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            raise ValueError(f"LLM did not return valid JSON: {raw[:500]}")

    return _call_with_key_rotation(call)


def get_embedding(text: str) -> list[float]:
    def call():
        result = genai.embed_content(
            model=f"models/{settings.embedding_model}",
            content=text,
            task_type="semantic_similarity",
        )
        return result["embedding"]

    return _call_with_key_rotation(call)

REDLINE_PROMPT = """You are a legal contract negotiation assistant. A clause has been flagged as deviating from standard playbook language.

Flagged clause ({clause_type}):
{clause_text}

Standard playbook language for this clause type:
{standard_language}

Draft a suggested replacement clause that brings the flagged language back in line with the standard, while staying reasonable for both parties. Then give a short (1-2 sentence) rationale explaining what changed and why.

Return ONLY JSON, no markdown fences, no explanation outside the JSON:
{{"suggested_text": "...", "rationale": "..."}}
"""


def generate_redline(clause_text: str, clause_type: str, standard_language: str) -> dict:
    def call():
        model = genai.GenerativeModel("gemini-3.6-flash")
        prompt = REDLINE_PROMPT.format(
            clause_type=clause_type,
            clause_text=clause_text,
            standard_language=standard_language,
        )
        response = model.generate_content(prompt)
        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            raise ValueError(f"LLM did not return valid JSON: {raw[:500]}")

    return _call_with_key_rotation(call)


COMPARE_VERSIONS_PROMPT = """You are a legal contract comparison assistant. Compare these two versions of a contract and identify meaningful changes section by section.

VERSION A:
{version_a_text}

VERSION B:
{version_b_text}

For each section that changed, return an object with:
- "section": a short label for the section/clause that changed
- "change_type": one of "added", "removed", "modified"
- "risk_impact": one of "increased", "decreased", "neutral" — does this change make the contract riskier or safer for the party relying on it?
- "summary": one sentence describing what changed

Return ONLY a JSON array, no markdown, no explanation. If there are no meaningful changes, return [].
"""


def compare_versions_llm(text_a: str, text_b: str) -> list[dict]:
    def call():
        model = genai.GenerativeModel("gemini-3.6-flash")
        prompt = COMPARE_VERSIONS_PROMPT.format(
            version_a_text=text_a[:15000],
            version_b_text=text_b[:15000],
        )
        response = model.generate_content(prompt)
        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            raise ValueError(f"LLM did not return valid JSON: {raw[:500]}")

    return _call_with_key_rotation(call)


EXTRACT_DATES_PROMPT = """You are a legal contract analyst. Identify all date-bearing obligations in this contract text: renewal dates, termination notice periods, payment due dates, and similar deadlines.

Contract text:
{contract_text}

For each obligation found, return an object with:
- "obligation_type": one of "renewal", "notice_period", "payment"
- "description": a short description of the obligation
- "due_date": an ISO date (YYYY-MM-DD) if a specific date is given, or null if only a relative period (e.g. "30 days notice") is stated

Return ONLY a JSON array, no markdown, no explanation.
"""


def extract_dates_llm(raw_text: str) -> list[dict]:
    def call():
        model = genai.GenerativeModel("gemini-3.6-flash")
        prompt = EXTRACT_DATES_PROMPT.format(contract_text=raw_text[:30000])
        response = model.generate_content(prompt)
        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            raise ValueError(f"LLM did not return valid JSON: {raw[:500]}")

    return _call_with_key_rotation(call)

RAG_ANSWER_PROMPT = """You are a contract Q&A assistant. Answer the question using ONLY the contract excerpts below. Cite the section reference for any fact you state. If the excerpts don't contain enough information to answer, say so explicitly — do not guess or use outside knowledge.

Contract excerpts:
{context}

Question: {question}

Answer concisely, and end with a citation like "(Section X.X)" pointing to the excerpt(s) you used.
"""


def answer_contract_question(question: str, context_chunks: list[dict]) -> str:
    context = "\n\n".join(
        f"[{c['section_ref'] or c['clause_type']}]: {c['text']}"
        for c in context_chunks
    )

    def call():
        model = genai.GenerativeModel("gemini-3.6-flash")
        prompt = RAG_ANSWER_PROMPT.format(context=context, question=question)
        response = model.generate_content(prompt)
        return response.text.strip()

    return _call_with_key_rotation(call)

SUMMARY_PROMPT = """You are a legal contract analyst. Write a concise executive summary of this contract for a business reader.

Contract text:
{contract_text}

Cover, in a short paragraph each:
- Parties involved
- Contract value/payment terms (if stated)
- Term length / duration
- The 2-3 most notable risk items a reviewer should know about

Keep it under 200 words total. Plain prose, no headers, no markdown.
"""


def generate_contract_summary(raw_text: str) -> str:
    def call():
        model = genai.GenerativeModel("gemini-3.6-flash")
        prompt = SUMMARY_PROMPT.format(contract_text=raw_text[:30000])
        response = model.generate_content(prompt)
        return response.text.strip()

    return _call_with_key_rotation(call)

COMPLIANCE_PROMPT = """You are a compliance analyst. Review this contract against these standard concerns:

1. Data protection — does the contract include adequate data-protection/confidentiality language if it involves handling personal or sensitive data?
2. Governing law / jurisdiction — is a clear, standard governing law specified, or is it missing/unusual (e.g. one party unilaterally choosing jurisdiction at will)?
3. Dispute resolution fairness — is the dispute resolution mechanism balanced, or does it disproportionately favor one party?

Contract text:
{contract_text}

For each concern that is actually raised by this contract, return an object with:
- "regulation_reference": a short label (e.g. "Data Protection", "Governing Law", "Dispute Resolution Fairness")
- "flag_reason": one sentence explaining the concern
- "severity": "low", "medium", or "high"

Return ONLY a JSON array. If no concerns apply, return [].
"""


def compliance_check_llm(raw_text: str) -> list[dict]:
    def call():
        model = genai.GenerativeModel("gemini-3.6-flash")
        prompt = COMPLIANCE_PROMPT.format(contract_text=raw_text[:30000])
        response = model.generate_content(prompt)
        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            raise ValueError(f"LLM did not return valid JSON: {raw[:500]}")

    return _call_with_key_rotation(call)