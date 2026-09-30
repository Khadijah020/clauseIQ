import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./clauseiq.css";

export default function ClauseReview() {
  const { clauseId } = useParams();
  const navigate = useNavigate();
  const [clause, setClause] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [escalate, setEscalate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function loadData() {
    Promise.all([
      api.get(`/api/clauses/${clauseId}`),
      api.get(`/api/clauses/${clauseId}/comments`),
    ]).then(([clauseRes, commentsRes]) => {
      setClause(clauseRes.data);
      setComments(commentsRes.data);
      setLoading(false);
    });
  }

  useEffect(() => {
    loadData();
  }, [clauseId]);

  async function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    await api.post(`/api/clauses/${clauseId}/comments`, {
      text: newComment,
      escalated: escalate,
    });
    setNewComment("");
    setEscalate(false);
    setSubmitting(false);
    loadData();
  }

  if (loading) return <p style={{ padding: "2rem" }}>Loading...</p>;

  return (
    <div className="ciq-clauses-page">
      <button className="ciq-btn ciq-btn--ghost" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="ciq-table-card" style={{ padding: 24, marginTop: 16 }}>
        <h1 style={{ fontFamily: "Source Serif 4, serif", marginTop: 0 }}>
          {clause.clause_type}
        </h1>

        <div style={{ display: "flex", gap: 32, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: "#69707e" }}>Risk Level</div>
            <strong>{clause.risk_level || "Not scored"}</strong>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#69707e" }}>Deviation</div>
            <strong>{clause.deviation_reason || "—"}</strong>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#69707e" }}>Section</div>
            <strong>{clause.section_ref || "—"}</strong>
          </div>
        </div>

        <p style={{ lineHeight: 1.6 }}>{clause.text}</p>

        {clause.risk_level && clause.risk_level !== "low" && (
          <button
            className="ciq-btn ciq-btn--primary"
            onClick={() => navigate(`/reviewer/clauses/${clauseId}/redline`)}
          >
            Suggest Redline
          </button>
        )}
      </div>

      <div className="ciq-table-card" style={{ padding: 24, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Comments</h3>
        {comments.length === 0 && <p style={{ color: "#69707e" }}>No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.id} style={{ borderTop: "1px solid #e4e1da", padding: "10px 0" }}>
            {c.escalated && (
              <span className="ciq-risk-badge ciq-risk-badge--high" style={{ marginBottom: 4, display: "inline-block" }}>
                Escalated
              </span>
            )}
            <p style={{ margin: 0 }}>{c.text}</p>
          </div>
        ))}

        <form onSubmit={handleAddComment} style={{ marginTop: 16 }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            placeholder="Add a comment..."
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          />
          <label style={{ display: "block", marginBottom: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={escalate}
              onChange={(e) => setEscalate(e.target.checked)}
            />{" "}
            Escalate for negotiation
          </label>
          <button className="ciq-btn ciq-btn--primary" type="submit" disabled={submitting}>
            {submitting ? "Posting..." : "Post Comment"}
          </button>
        </form>
      </div>
    </div>
  );
}