import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./clauseiq.css";

function riskTier(score) {
  if (score == null) return { label: "—", className: "rq-risk--none" };
  if (score < 3) return { label: score, className: "rq-risk--low" };
  if (score < 7) return { label: score, className: "rq-risk--medium" };
  return { label: score, className: "rq-risk--high" };
}

export default function ReviewerQueue() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api
      .get("/api/contracts", { params: { status: "Pending Review", sort: "risk_score" } })
      .then((res) => {
        if (!active) return;
        setContracts(res.data ?? []);
      })
      .catch(() => {
        if (!active) return;
        setError("Couldn't load the review queue. Try refreshing.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="ciq-clauses-page">
      <style>{`
        .rq-header {
          margin-bottom: 20px;
        }

        .rq-subtitle {
          font-size: 0.88rem;
          color: var(--ciq-muted);
          margin: 4px 0 0;
        }

        .rq-table-card {
          border: 1px solid var(--ciq-line);
          border-radius: 12px;
          background: var(--ciq-surface);
          overflow: hidden;
        }

        .rq-table {
          width: 100%;
          border-collapse: collapse;
        }

        .rq-table thead th {
          text-align: left;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: var(--ciq-muted);
          padding: 12px 20px;
          background: #f7f6f1;
          border-bottom: 1px solid var(--ciq-line);
        }

        .rq-row {
          cursor: pointer;
          transition: background 0.12s ease;
        }

        .rq-row:not(:last-child) td {
          border-bottom: 1px solid var(--ciq-line);
        }

        .rq-row:hover {
          background: #f7f6f1;
        }

        .rq-table td {
          padding: 14px 20px;
          font-size: 0.9rem;
          vertical-align: middle;
        }

        .rq-title {
          font-family: "Source Serif 4", serif;
          font-weight: 600;
          color: var(--ciq-text);
        }

        .rq-counterparty {
          color: var(--ciq-muted);
        }

        .rq-risk {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 30px;
          font-family: "IBM Plex Mono", monospace;
          font-weight: 600;
          font-size: 0.82rem;
          padding: 4px 11px;
          border-radius: 999px;
        }

        .rq-risk--low {
          background: var(--ciq-risk-low-bg, #e8f0e8);
          color: var(--ciq-risk-low, #2e7d32);
        }

        .rq-risk--medium {
          background: var(--ciq-risk-medium-bg, #fbeee0);
          color: var(--ciq-risk-medium, #b07a0a);
        }

        .rq-risk--high {
          background: #fbe9e7;
          color: #c62828;
        }

        .rq-risk--none {
          background: #f0efe9;
          color: var(--ciq-muted);
        }

        .rq-chevron {
          color: var(--ciq-muted);
          width: 16px;
          height: 16px;
        }

        .rq-col-chevron {
          width: 32px;
          text-align: right;
        }

        .rq-error {
          padding: 12px 18px;
          border-radius: 10px;
          background: var(--ciq-risk-medium-bg, #fbeee0);
          color: var(--ciq-risk-medium, #94590f);
          font-size: 0.86rem;
          margin-bottom: 16px;
        }
      `}</style>

      <div className="rq-header">
        <h1 className="ciq-page-title">Legal Reviewer Queue</h1>
        <p className="rq-subtitle">Contracts awaiting review, sorted by risk score.</p>
      </div>

      {error && <div className="rq-error">{error}</div>}

      <div className="rq-table-card">
        <table className="rq-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Counterparty</th>
              <th>Risk score</th>
              <th className="rq-col-chevron"></th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td><span className="ciq-skeleton" style={{ width: "55%" }} /></td>
                  <td><span className="ciq-skeleton" style={{ width: "40%" }} /></td>
                  <td><span className="ciq-skeleton" style={{ width: 28, height: 20, borderRadius: 999 }} /></td>
                  <td></td>
                </tr>
              ))}

            {!loading && !error && contracts.length === 0 && (
              <tr>
                <td colSpan={4} className="ciq-empty">
                  No contracts pending review.
                </td>
              </tr>
            )}

            {!loading &&
              contracts.map((c) => {
                const risk = riskTier(c.risk_score);
                return (
                  <tr
                    key={c.id}
                    className="rq-row"
                    onClick={() => navigate(`/reviewer/contracts/${c.id}/clauses`)}
                  >
                    <td className="rq-title">{c.title}</td>
                    <td className="rq-counterparty">{c.counterparty}</td>
                    <td>
                      <span className={`rq-risk ${risk.className}`}>{risk.label}</span>
                    </td>
                    <td className="rq-col-chevron">
                      <svg className="rq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}