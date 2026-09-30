import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./clauseiq.css";

export default function RedlineSuggestion() {
  const { clauseId } = useParams();
  const navigate = useNavigate();
  const [clause, setClause] = useState(null);
  const [redline, setRedline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.get(`/api/clauses/${clauseId}`).then((res) => {
      setClause(res.data);
      setLoading(false);
    });
  }, [clauseId]);

  async function handleGenerate() {
    setGenerating(true);
    const res = await api.post("/api/ai/redline", null, { params: { clause_id: clauseId } });
    setRedline(res.data);
    setGenerating(false);
  }

  async function handleDecision(status) {
    await api.put(`/api/ai/redline/${redline.id}`, null, { params: { status } });
    setRedline({ ...redline, status });
  }

  if (loading) return <p style={{ padding: "2rem" }}>Loading...</p>;

  return (
    <div className="ciq-clauses-page">
      <button className="ciq-btn ciq-btn--ghost" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="ciq-table-card" style={{ padding: 24, marginTop: 16 }}>
        <h1 style={{ fontFamily: "Source Serif 4, serif", marginTop: 0 }}>
          AI-Suggested Redline
        </h1>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#69707e" }}>Original Clause</div>
          <p>{clause.text}</p>
        </div>

        {!redline && (
          <button className="ciq-btn ciq-btn--primary" onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating..." : "Suggest Redline"}
          </button>
        )}

        {redline && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#69707e" }}>Suggested Alternative Language</div>
              <p>{redline.suggested_text}</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#69707e" }}>Rationale</div>
              <p>{redline.rationale}</p>
            </div>

            {redline.status === "pending" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="ciq-btn ciq-btn--primary" onClick={() => handleDecision("accepted")}>
                  Accept
                </button>
                <button className="ciq-btn ciq-btn--ghost" onClick={() => handleDecision("dismissed")}>
                  Dismiss
                </button>
              </div>
            ) : (
              <p style={{ fontWeight: 600 }}>Status: {redline.status}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}