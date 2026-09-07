import enum


class UserRole(str, enum.Enum):
    business_user = "business_user"
    legal_reviewer = "legal_reviewer"
    admin = "admin"


class ContractStatus(str, enum.Enum):
    processing = "Processing"
    parsed = "Parsed"
    scored = "Scored"
    pending_review = "Pending Review"
    approved = "Approved"
    changes_requested = "Changes Requested"


class RedlineStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    dismissed = "dismissed"


class ObligationType(str, enum.Enum):
    renewal = "renewal"
    notice_period = "notice_period"
    payment = "payment"