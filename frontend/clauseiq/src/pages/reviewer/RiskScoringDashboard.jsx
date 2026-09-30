import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./clauseiq.css";

const RISK_ORDER = { high: 0, medium: 1, low: 2 };

const RISK_META = {
  high: { label: "High", badgeClass: "ciq-risk-badge--high" },
  medium: { label: "Medium", badgeClass: "ciq-risk-badge--medium" },
  low: { label: "Low", badgeClass: "ciq-risk-badge--low" },
};

function scoreTier(score) {
  if (score === null || score === undefined) return null;
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export default function RiskScoringDashboard() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [clauses, setClauses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rescoring, setRescoring] = useState(false);
  const [notice, setNotice] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api.get(`/api/contracts/${contractId}`),
      api.get(`/api/contracts/${contractId}/clauses`),
    ])
      .then(([contractRes, clausesRes]) => {
        if (!active) return;
        setContract(contractRes.data);
        setClauses(clausesRes.data ?? []);
      })
      .catch(() => {
        if (!active) return;
        setError(
          "Couldn't load risk scoring for this contract. Try refreshing.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contractId]);

  // Close the menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;

    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const sorted = useMemo(
    () =>
      [...clauses].sort(
        (a, b) =>
          (RISK_ORDER[a.risk_level] ?? 3) - (RISK_ORDER[b.risk_level] ?? 3),
      ),
    [clauses],
  );

  const counts = useMemo(() => {
    const c = { high: 0, medium: 0, low: 0, unscored: 0 };
    clauses.forEach((clause) => {
      if (clause.risk_level && c[clause.risk_level] !== undefined) {
        c[clause.risk_level] += 1;
      } else {
        c.unscored += 1;
      }
    });
    return c;
  }, [clauses]);

  async function handleExtractDates() {
    setMenuOpen(false);
    await api.post("/api/ai/extract-dates", null, {
      params: { contract_id: contractId },
    });
    alert("Extracting dates — check Key Dates in a few seconds.");
  }

  async function handleRescore() {
    setRescoring(true);
    setNotice(null);
    try {
      await api.post("/api/ai/score-risk", null, {
        params: { contract_id: contractId },
      });
      setNotice({
        type: "success",
        text: "Re-scoring started — this page will reflect new scores in a few seconds.",
      });
    } catch {
      setNotice({
        type: "error",
        text: "Couldn't start re-scoring. Please try again.",
      });
    } finally {
      setRescoring(false);
    }
  }

  function goTo(path) {
    setMenuOpen(false);
    navigate(path);
  }

  const tier = contract ? scoreTier(contract.risk_score) : null;

  const menuItems = [
    
    { label: "Extract key dates", onClick: handleExtractDates },
    {
      label: "Ask about this contract",
      onClick: () => goTo(`/contracts/${contractId}/chat`),
    },
    {
      label: "See audit trail",
      onClick: () => goTo(`/contracts/${contractId}/audit`),
    },
    {
      label: "Approval & signature",
      onClick: () => goTo(`/approvals/${contractId}`),
    },
    {
      label: "Compliance check",
      onClick: () => goTo(`/reviewer/contracts/${contractId}/compliance`),
    },
  ];

  return (
    <div className="ciq-risk-page">
      <div className="ciq-risk-page__header">
        <div>
          <p className="ciq-risk-page__eyebrow">Risk scoring</p>
          <h1 className="ciq-risk-page__title">
            {loading ? (
              <span
                className="ciq-skeleton"
                style={{ width: 220, height: 26 }}
              />
            ) : (
              contract?.title
            )}
          </h1>
        </div>

        <div className="ciq-risk-page__actions">
          <button
            type="button"
            className="ciq-btn ciq-btn--primary"
            onClick={handleRescore}
            disabled={rescoring || loading}
          >
            {rescoring ? "Re-scoring…" : "Re-score"}
          </button>

          <div className="ciq-icon-menu" ref={menuRef}>
            <button
              type="button"
              className="ciq-icon-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label="More actions"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.5 4.5H15.5M2.5 9H15.5M2.5 13.5H15.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {menuOpen && (
              <div className="ciq-icon-menu__dropdown" role="menu">
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="ciq-icon-menu__item"
                    onClick={item.onClick}
                    role="menuitem"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={`ciq-alert ${notice.type === "success" ? "ciq-alert--success" : "ciq-alert--error"}`}
        >
          {notice.text}
        </div>
      )}
      {error && <div className="ciq-alert ciq-alert--error">{error}</div>}

      <div className="ciq-score-panel">
        <div className="ciq-score-panel__main">
          <span className="ciq-score-panel__label">Overall risk score</span>
          {loading ? (
            <span className="ciq-skeleton" style={{ width: 90, height: 40 }} />
          ) : (
            <span
              className={`ciq-score-panel__value${tier ? ` ciq-score-panel__value--${tier}` : ""}`}
            >
              {contract?.risk_score ?? "—"}
            </span>
          )}
        </div>
        <div className="ciq-score-panel__breakdown">
          {["high", "medium", "low"].map((level) => (
            <span
              key={level}
              className={`ciq-score-chip ciq-score-chip--${level}`}
            >
              {counts[level]} {RISK_META[level].label.toLowerCase()}
            </span>
          ))}
          {counts.unscored > 0 && (
            <span className="ciq-score-chip">{counts.unscored} unscored</span>
          )}
        </div>
      </div>

      <div className="ciq-clause-list">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="ciq-clause-card ciq-clause-card--skeleton"
            >
              <span
                className="ciq-skeleton"
                style={{ width: "35%", height: 14, marginBottom: 10 }}
              />
              <span
                className="ciq-skeleton"
                style={{ width: "90%", height: 12, marginBottom: 6 }}
              />
              <span
                className="ciq-skeleton"
                style={{ width: "70%", height: 12 }}
              />
            </div>
          ))}

        {!loading && sorted.length === 0 && (
          <div className="ciq-empty-state">
            <p className="ciq-empty-state__title">No clauses to score yet.</p>
            <p className="ciq-empty-state__subtitle">
              Once this contract has extracted clauses, re-score to generate a
              risk breakdown.
            </p>
          </div>
        )}

        {!loading &&
          sorted.map((c) => {
            const risk = RISK_META[c.risk_level];
            return (
              <div
                key={c.id}
                className={`ciq-clause-card${risk ? ` ciq-clause-card--${c.risk_level}` : ""}`}
                onClick={() => navigate(`/reviewer/clauses/${c.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="ciq-clause-card__head">
                  <span className="ciq-clause-card__type">{c.clause_type}</span>
                  {risk ? (
                    <span className={`ciq-risk-badge ${risk.badgeClass}`}>
                      {risk.label}
                    </span>
                  ) : (
                    <span className="ciq-risk-badge">Unscored</span>
                  )}
                </div>
                <p className="ciq-clause-card__text">{c.text}</p>
                {c.deviation_reason && (
                  <p className="ciq-clause-card__reason">
                    {c.deviation_reason}
                  </p>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}