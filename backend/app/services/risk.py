def cosine_distance_to_risk(distance: float, clean_anchor: float, aggressive_anchor: float) -> tuple[str, str]:
    """
    Positions the distance on a 0-1 scale between a known-clean and
    known-aggressive reference point for this clause type, rather than
    applying one fixed multiplier across every clause type equally.
    """
    span = aggressive_anchor - clean_anchor
    if span <= 0:
        position = 0.5  # misconfigured anchors — fall back to neutral
    else:
        position = (distance - clean_anchor) / span
    position = max(0.0, min(1.0, position))  # clamp to 0-1

    if position < 0.33:
        return "low", "Clause language closely matches standard playbook terms."
    elif position < 0.66:
        return "medium", "Clause language moderately deviates from standard playbook terms."
    else:
        return "high", "Clause language significantly deviates from standard playbook terms — recommend review."


def compute_contract_risk_score(clause_risk_levels: list[str]) -> float:
    weights = {"low": 1, "medium": 5, "high": 10}
    if not clause_risk_levels:
        return 0.0
    total = sum(weights.get(level, 0) for level in clause_risk_levels)
    return round(total / len(clause_risk_levels), 2)