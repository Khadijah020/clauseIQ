import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "../reviewer/clauseiq.css";

const STATUS_STYLE = {
  Processing: { bg: "#f0efe9", color: "#69707e" },
  Parsed: { bg: "#f0efe9", color: "#69707e" },
  Scored: { bg: "#f0efe9", color: "#69707e" },
  "Pending Review": { bg: "#f4ecda", color: "#a9782c" },
  Approved: { bg: "#e5efe8", color: "#3f7a56" },
  "Changes Requested": { bg: "#f6e6e4", color: "#a23b3b" },
  Failed: { bg: "#f6e6e4", color: "#a23b3b" },
};

const REVIEWABLE_STATUSES = ["Pending Review", "Approved", "Changes Requested"];
const CHAT_READY_STATUSES = ["Parsed", "Scored", "Pending Review", "Approved", "Changes Requested"];

export default function BusinessDashboard() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/contracts", { params: { mine: true } }).then((res) => {
      setContracts(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p style={{ padding: "2rem" }}>Loading...</p>;

  return (
    <div className="ciq-clauses-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 className="ciq-page-title" style={{ margin: 0 }}>My Contracts</h1>
        <button className="ciq-btn ciq-btn--primary" onClick={() => navigate("/business/intake")}>
          + Upload Contract
        </button>
      </div>

      {contracts.length === 0 && (
        <div className="ciq-table-card">
          <p className="ciq-empty">
            You haven't uploaded any contracts yet.
          </p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {contracts.map((c) => {
          const style = STATUS_STYLE[c.status] || STATUS_STYLE.Processing;
          return (
            <div key={c.id} className="ciq-table-card" style={{ padding: 18 }}>
              <strong style={{ display: "block", marginBottom: 6 }}>{c.title}</strong>
              <span style={{ fontSize: 13, color: "#69707e" }}>{c.counterparty}</span>
              <div style={{ marginTop: 12 }}>
                <span
                  className="ciq-risk-badge"
                  style={{ background: style.bg, color: style.color }}
                >
                  {c.status}
                </span>
              </div>
              {c.status === "Changes Requested" && (
                <p style={{ fontSize: 12, color: "#a23b3b", marginTop: 8, marginBottom: 0 }}>
                  Reviewer suggested changes — click to view
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {CHAT_READY_STATUSES.includes(c.status) && (
                  <button
                    className="ciq-btn ciq-btn--ghost"
                    onClick={() => navigate(`/contracts/${c.id}/chat`)}
                  >
                    Ask about this contract
                  </button>
                  
                )}
                <button
  className="ciq-btn ciq-btn--ghost"
  onClick={() => navigate(`/contracts/${c.id}/summary`)}
>
  View Summary
</button>
                {REVIEWABLE_STATUSES.includes(c.status) && (
                  <button
                    className="ciq-btn ciq-btn--ghost"
                    onClick={() => navigate(`/business/contracts/${c.id}/review`)}
                  >
                    See Review
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}