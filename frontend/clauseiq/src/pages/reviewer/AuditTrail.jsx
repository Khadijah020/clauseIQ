import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import "./clauseiq.css";

const ACTION_META = {
  created: { label: "Created", className: "ciq-action-dot--created" },
  updated: { label: "Updated", className: "ciq-action-dot--updated" },
  approved: { label: "Approved", className: "ciq-action-dot--approved" },
  rejected: { label: "Rejected", className: "ciq-action-dot--rejected" },
  scored: { label: "Scored", className: "ciq-action-dot--scored" },
  commented: { label: "Commented", className: "ciq-action-dot--commented" },
  upload: { label: "Uploaded", className: "ciq-action-dot--created" },
};

function formatAction(action) {
  return ACTION_META[action]?.label ?? action.replace(/_/g, " ");
}

function actionDotClass(action) {
  return ACTION_META[action]?.className ?? "ciq-action-dot--default";
}

function formatTimestamp(ts) {
  const isoString = /Z|[+-]\d{2}:\d{2}$/.test(ts) ? ts : `${ts}Z`;
  const date = new Date(isoString);

  return {
    date: date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}
export default function AuditTrail() {
  const { contractId } = useParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api
      .get(`/api/contracts/${contractId}/audit`)
      .then((res) => {
        if (!active) return;
        setLogs(res.data ?? []);
      })
      .catch(() => {
        if (!active) return;
        setError("Couldn't load the audit trail. Try refreshing.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contractId]);

  return (
    <div className="ciq-clauses-page">
      <div className="ciq-page-header">
        <div>
          <p className="ciq-page-header__eyebrow">History</p>
          <h1 className="ciq-page-title">Audit Trail</h1>
        </div>
        {!loading && logs.length > 0 && (
          <span className="ciq-page-header__count">
            {logs.length} {logs.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {error && <div className="ciq-alert ciq-alert--error">{error}</div>}

      <div className="ciq-table-card">
        <table className="ciq-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>User</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td>
                    <span
                      className="ciq-skeleton"
                      style={{ width: 100, height: 14 }}
                    />
                  </td>
                  <td>
                    <span
                      className="ciq-skeleton"
                      style={{ width: 140, height: 14 }}
                    />
                  </td>
                  <td>
                    <span
                      className="ciq-skeleton"
                      style={{ width: 120, height: 14 }}
                    />
                  </td>
                </tr>
              ))}

            {!loading && logs.length === 0 && !error && (
              <tr>
                <td colSpan={3} className="ciq-empty">
                  No actions logged yet.
                </td>
              </tr>
            )}

            {!loading &&
              logs.map((l) => {
                const { date, time } = formatTimestamp(l.timestamp);
                return (
                  <tr key={l.id}>
                    <td>
                      <span className="ciq-action-cell">
                        <span
                          className={`ciq-action-dot ${actionDotClass(l.action)}`}
                        />
                        {formatAction(l.action)}
                      </span>
                    </td>
                    <td className="ciq-cell--user">{l.user_email}</td>
                    <td className="ciq-cell--mono">
                      {date}
                      <span className="ciq-cell__time">{time}</span>
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