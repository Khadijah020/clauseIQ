from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.clause import Clause
from app.models.contract import Contract
from app.models.obligation import Obligation
from app.models.user import User

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/portfolio")
async def portfolio_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_result = await db.execute(select(func.count(Contract.id)))
    total_contracts = total_result.scalar() or 0

    avg_result = await db.execute(select(func.avg(Contract.risk_score)).where(Contract.risk_score.isnot(None)))
    avg_risk = avg_result.scalar()

    high_risk_result = await db.execute(select(func.count(Contract.id)).where(Contract.risk_score >= 7))
    high_risk_count = high_risk_result.scalar() or 0

    ninety_days = date.today() + timedelta(days=90)
    renewals_result = await db.execute(
        select(func.count(Obligation.id)).where(
            Obligation.obligation_type == "renewal",
            Obligation.due_date.isnot(None),
            Obligation.due_date <= ninety_days,
        )
    )
    upcoming_renewals = renewals_result.scalar() or 0

    dist_result = await db.execute(
        select(Clause.clause_type, func.avg(func.length(Clause.text))).group_by(Clause.clause_type)
    )
    # (kept simple: clause-type counts used for the chart below, not text length —
    # see the corrected query beneath this comment)
    clause_dist_result = await db.execute(
        select(Clause.clause_type, func.count(Clause.id)).group_by(Clause.clause_type)
    )
    clause_distribution = [
        {"clause_type": row[0], "count": row[1]} for row in clause_dist_result.all()
    ]

    return {
        "total_contracts": total_contracts,
        "average_risk_score": round(avg_risk, 1) if avg_risk else None,
        "upcoming_renewals_90d": upcoming_renewals,
        "high_risk_percentage": round((high_risk_count / total_contracts) * 100, 1) if total_contracts else 0,
        "clause_type_distribution": clause_distribution,
    }