import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import "../reviewer/clauseiq.css";

const TYPE_META = {
  renewal: { label: "Renewal", className: "ciq-obligation-badge--renewal" },
  notice_period: { label: "Notice period", className: "ciq-obligation-badge--notice" },
  payment: { label: "Payment", className: "ciq-obligation-badge--payment" },
};

const DURATION_CLASS = {
  renewal: "kd-duration--renewal",
  notice_period: "kd-duration--notice",
  payment: "kd-duration--payment",
};

// Label the number so it can't be misread as a countdown ("5 days left").
// It's the length of the period itself, not time remaining.
const DURATION_UNIT_LABEL = {
  renewal: "day renewal",
  notice_period: "day notice",
  payment: "day term",
};

function typeBadge(type) {
  const meta = TYPE_META[type];
  return (
    <span className={`ciq-obligation-badge${meta ? ` ${meta.className}` : ""}`}>
      {meta ? meta.label : type}
    </span>
  );
}

// Pulls a "15 days" style figure out of free text for a quick visual anchor.
// Prefers a parenthesized digit ("fifteen (15) days") since that's the
// unambiguous form; falls back to a bare number ("10 days").
function extractDuration(text) {
  if (!text) return null;
  const paren = text.match(/\((\d+)\)\s*day/i);
  if (paren) return paren[1];
  const bare = text.match(/(\d+)\s*days?/i);
  if (bare) return bare[1];
  return null;
}

export default function KeyDatesCalendar() {
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api
      .get("/api/contracts/obligations/all")
      .then((res) => {
        if (!active) return;
        setObligations(res.data ?? []);
      })
      .catch(() => {
        if (!active) return;
        setError("Couldn't load key dates. Try refreshing.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Flat, sorted-by-date list across ALL contracts — the "what's due soonest" view.
  const dated = useMemo(() => {
    return obligations
      .filter((o) => o.due_date)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [obligations]);

  // Recurring/no-fixed-date obligations grouped by contract, since a bare
  // "15 days" only makes sense once you know which agreement it belongs to.
  const undatedGroups = useMemo(() => {
    const byContract = new Map();

    for (const o of obligations) {
      if (o.due_date) continue;
      const key = o.contract_title || "Untitled agreement";
      if (!byContract.has(key)) {
        byContract.set(key, { contractTitle: key, items: [] });
      }
      byContract.get(key).items.push(o);
    }

    const list = Array.from(byContract.values());
    for (const g of list) {
      g.items.sort((a, b) => (a.description || "").localeCompare(b.description || ""));
    }
    list.sort((a, b) => a.contractTitle.localeCompare(b.contractTitle));
    return list;
  }, [obligations]);

  return (
    <div className="ciq-clauses-page">
      <style>{`
        .kd-groups-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        @media (max-width: 900px) {
          .kd-groups-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .kd-groups-grid {
            grid-template-columns: 1fr;
          }
        }

        .kd-group {
          aspect-ratio: 1 / 1;
          border: 1px solid var(--ciq-line);
          border-radius: 10px;
          background: var(--ciq-surface);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .kd-group__header {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--ciq-line);
          background: #f7f6f1;
          flex: 0 0 auto;
        }

        .kd-group__title {
          font-family: "Source Serif 4", serif;
          font-weight: 600;
          font-size: 0.92rem;
          color: var(--ciq-text);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .kd-group__count {
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.68rem;
          color: var(--ciq-muted);
        }

        .kd-recur-grid {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          padding: 12px 14px;
          scrollbar-width: thin;
        }

        .kd-recur-card {
          display: flex;
          align-items: stretch;
          gap: 12px;
          background: #fff;
          border: 1px solid var(--ciq-line);
          border-radius: 8px;
          padding: 10px 12px;
          flex-shrink: 0;
        }

        .kd-duration {
          flex: 0 0 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: #f0efe9;
          color: var(--ciq-muted);
          padding: 6px 4px;
          text-align: center;
        }

        .kd-duration--renewal { background: var(--ciq-risk-low-bg); color: var(--ciq-risk-low); }
        .kd-duration--notice { background: var(--ciq-risk-medium-bg); color: var(--ciq-risk-medium); }
        .kd-duration--payment { background: var(--ciq-gold-soft); color: var(--ciq-ink); }

        .kd-duration__num {
          font-family: "IBM Plex Mono", monospace;
          font-size: 1.05rem;
          font-weight: 500;
          line-height: 1.1;
        }

        .kd-duration__unit {
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.56rem;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          margin-top: 2px;
          line-height: 1.15;
        }

        .kd-recur-card__body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
        }

        .kd-recur-card__meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .kd-recur-card__desc {
          font-size: 0.8rem;
          line-height: 1.4;
          color: var(--ciq-text);
          margin: 0;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
        }

        .kd-recur-card--skeleton {
          align-items: center;
        }
      `}</style>

      <h1 className="ciq-page-title">Key Dates & Obligations</h1>

      {error && <div className="ciq-alert ciq-alert--error">{error}</div>}

      <h2 className="ciq-section-title">Upcoming (dated)</h2>
      <div className="ciq-table-card">
        <table className="ciq-table">
          <thead>
            <tr>
              <th>Due date</th>
              <th>Type</th>
              <th>Contract</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="ciq-row--skeleton">
                  <td><span className="ciq-skeleton" style={{ width: "60%" }} /></td>
                  <td><span className="ciq-skeleton" style={{ width: "50%" }} /></td>
                  <td><span className="ciq-skeleton" style={{ width: "70%" }} /></td>
                  <td><span className="ciq-skeleton" style={{ width: "80%" }} /></td>
                </tr>
              ))}

            {!loading && dated.length === 0 && (
              <tr>
                <td colSpan={4} className="ciq-empty">
                  No dated obligations tracked yet.
                </td>
              </tr>
            )}

            {!loading &&
              dated.map((o) => (
                <tr key={o.id}>
                  <td className="ciq-cell--mono">{o.due_date}</td>
                  <td>{typeBadge(o.obligation_type)}</td>
                  <td>{o.contract_title}</td>
                  <td>{o.description}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <h2 className="ciq-section-title">Recurring / no fixed date</h2>

      {loading && (
        <div className="kd-groups-grid">
          {Array.from({ length: 3 }).map((_, gi) => (
            <div key={`group-skeleton-${gi}`} className="kd-group">
              <div className="kd-group__header">
                <span className="ciq-skeleton" style={{ width: "60%", height: 14 }} />
              </div>
              <div className="kd-recur-grid">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={`recur-skeleton-${gi}-${i}`} className="kd-recur-card kd-recur-card--skeleton">
                    <div className="kd-duration">
                      <span className="ciq-skeleton" style={{ width: 24, height: 16 }} />
                    </div>
                    <div className="kd-recur-card__body">
                      <span className="ciq-skeleton" style={{ width: "40%" }} />
                      <span className="ciq-skeleton" style={{ width: "80%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && undatedGroups.length === 0 && (
        <div className="ciq-table-card">
          <p className="ciq-empty">No recurring obligations tracked yet.</p>
        </div>
      )}

      {!loading && undatedGroups.length > 0 && (
        <div className="kd-groups-grid">
          {undatedGroups.map((g) => (
            <div key={g.contractTitle} className="kd-group">
              <div className="kd-group__header">
                <h3 className="kd-group__title" title={g.contractTitle}>
                  {g.contractTitle}
                </h3>
                <span className="kd-group__count">
                  {g.items.length} obligation{g.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="kd-recur-grid">
                {g.items.map((o) => {
                  const duration = extractDuration(o.period_description || o.description);
                  const unitLabel = DURATION_UNIT_LABEL[o.obligation_type] || "days";
                  return (
                    <div key={o.id} className="kd-recur-card">
                      <div className={`kd-duration ${DURATION_CLASS[o.obligation_type] || ""}`}>
                        {duration ? (
                          <>
                            <span className="kd-duration__num">{duration}</span>
                            <span className="kd-duration__unit">{unitLabel}</span>
                          </>
                        ) : (
                          <span className="kd-duration__unit">—</span>
                        )}
                      </div>
                      <div className="kd-recur-card__body">
                        <div className="kd-recur-card__meta">
                          {typeBadge(o.obligation_type)}
                        </div>
                        <p className="kd-recur-card__desc">
                          {o.period_description || o.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}