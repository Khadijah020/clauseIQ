import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./clauseiq.css";

const SEVERITY_STYLE = {
  high: { bg: "#f6e6e4", color: "#a23b3b" },
  medium: { bg: "#f4ecda", color: "#a9782c" },
  low: { bg: "#e5efe8", color: "#3f7a56" },
};

export default function ComplianceFlags() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  function load() {
    api.get(`/api/ai/compliance-flags/${contractId}`).then((res) => {
      setFlags(res.data);
      setLoading(false);
    });
  }

  useEffect(load, [contractId]);

  async function handleCheck() {
    setChecking(true);
    await api.post("/api/ai/compliance-check", null, { params: { contract_id: contractId } });
    setChecking(false);
    load();
  }

  if (loading) return <p style={{ padding: "2rem" }}>Loading...</p>;

  return (
    <div className="ciq-clauses-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 className="ciq-page-title" style={{ margin: 0 }}>Compliance Flags</h1>
        <button className="ciq-btn ciq-btn--primary" onClick={handleCheck} disabled={checking}>
          {checking ? "Checking..." : "Run Compliance Check"}
        </button>
      </div>

      {flags.length === 0 && (
        <div className="ciq-table-card">
          <p className="ciq-empty">No compliance concerns flagged. Run a check to analyze this contract.</p>
        </div>
      )}

      {flags.map((f) => {
        const style = SEVERITY_STYLE[f.severity] || SEVERITY_STYLE.low;
        return (
          <div key={f.id} className="ciq-table-card" style={{ padding: 18, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{f.regulation_reference}</strong>
              <span className="ciq-risk-badge" style={{ background: style.bg, color: style.color }}>
                {f.severity}
              </span>
            </div>
            <p style={{ margin: "8px 0 0" }}>{f.flag_reason}</p>
          </div>
        );
      })}
    </div>
  );
}