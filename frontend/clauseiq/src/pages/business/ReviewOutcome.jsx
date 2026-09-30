import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "../reviewer/clauseiq.css";

export default function ReviewOutcome() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [redlines, setRedlines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/api/contracts/${contractId}`),
      api.get(`/api/contracts/${contractId}/redlines`),
    ]).then(([contractRes, redlinesRes]) => {
      setContract(contractRes.data);
      setRedlines(redlinesRes.data);
      setLoading(false);
    });
  }, [contractId]);

  if (loading) return <p style={{ padding: "2rem" }}>Loading...</p>;

  const isApproved = contract.status === "Approved";

  return (
    <div className="ciq-clauses-page">
      <button className="ciq-btn ciq-btn--ghost" onClick={() => navigate("/business")}>
        ← Back to my contracts
      </button>

      <div className="ciq-table-card" style={{ padding: 24, marginTop: 16, marginBottom: 20 }}>
        <h1 style={{ marginTop: 0 }}>{contract.title}</h1>
        {isApproved ? (
          <>
            <p style={{ color: "#3f7a56", fontWeight: 600, fontSize: 16 }}>✓ Approved</p>
            <button className="ciq-btn ciq-btn--primary" onClick={() => navigate(`/approvals/${contractId}`)}>
              View signature status
            </button>
          </>
        ) : (
          <p style={{ color: "#a9782c", fontWeight: 600, fontSize: 16 }}>
            {contract.status === "Changes Requested" ? "Changes requested" : "Awaiting reviewer decision"}
          </p>
        )}
      </div>

      {!isApproved && (
        <>
          <h2 className="ciq-section-title">Suggested Changes</h2>
          {redlines.length === 0 && (
            <div className="ciq-table-card">
              <p className="ciq-empty">No changes suggested yet — still under review.</p>
            </div>
          )}
          {redlines.map((r) => (
            <div key={r.redline_id} className="ciq-table-card" style={{ padding: 20, marginBottom: 16 }}>
              <strong>{r.clause_type}</strong>
              <div style={{ marginTop: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#69707e", marginBottom: 4 }}>Original clause</div>
                <p style={{ margin: 0, background: "#f6e6e4", padding: 10, borderRadius: 6 }}>
                  {r.original_text}
                </p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#69707e", marginBottom: 4 }}>Suggested replacement</div>
                <p style={{ margin: 0, background: "#e5efe8", padding: 10, borderRadius: 6 }}>
                  {r.suggested_text}
                </p>
              </div>
              <div style={{ fontSize: 13, color: "#69707e", fontStyle: "italic" }}>
                {r.rationale}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}