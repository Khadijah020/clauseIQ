import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./clauseiq.css";

const RISK_META = {
  high: { label: "High", className: "ciq-risk--high" },
  medium: { label: "Medium", className: "ciq-risk--medium" },
  low: { label: "Low", className: "ciq-risk--low" },
};

function normalizeRisk(value) {
  if (!value) return null;
  const v = String(value).toLowerCase();
  if (v.startsWith("h")) return "high";
  if (v.startsWith("m")) return "medium";
  if (v.startsWith("l")) return "low";
  return null;
}

function formatConfidence(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  const pct = num <= 1 ? num * 100 : num;
  return Math.round(pct);
}

const EMPTY_FORM = {
  clause_type: "",
  section_ref: "",
  confidence: "",
  risk_flag: "medium",
  text: "",
};

export default function ExtractedClauses() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [clauses, setClauses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api
      .get(`/api/contracts/${contractId}/clauses`)
      .then((res) => {
        if (!active) return;
        setClauses(res.data ?? []);
      })
      .catch(() => {
        if (!active) return;
        setError("Couldn't load clauses for this contract. Try refreshing.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contractId]);

  const filteredClauses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clauses;
    return clauses.filter((c) =>
      [c.clause_type, c.section_ref, c.text]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [clauses, query]);

  function handleFormChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAddClause(e) {
    e.preventDefault();
    if (!form.clause_type.trim()) return;

    setSubmitting(true);
    const payload = {
      clause_type: form.clause_type.trim(),
      section_ref: form.section_ref.trim(),
      confidence: form.confidence === "" ? null : Number(form.confidence) / 100,
      risk_level: form.risk_flag,
      text: form.text.trim(),
    };

    try {
      const res = await api.post(`/api/contracts/${contractId}/clauses`, payload);
      const created = res?.data ?? { ...payload, id: `temp-${Date.now()}` };
      setClauses((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
      setShowAddModal(false);
    } catch {
      setError("Couldn't save that clause. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ciq-clauses-page">
      <div className="ciq-toolbar">
        <div className="ciq-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ciq-search__icon">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search clauses, sections, or terms…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search extracted clauses"
          />
        </div>
        <div className="ciq-toolbar__actions">
          <button
            type="button"
            className="ciq-btn ciq-btn--primary"
            onClick={() => navigate(`/reviewer/contracts/${contractId}/risk`)}
          >
            View Risk Scoring →
          </button>
          
        </div>
      </div>

      {error && <div className="ciq-alert ciq-alert--error">{error}</div>}

      <div className="ciq-table-card">
        <table className="ciq-table">
          <thead>
            <tr>
              <th>Clause type</th>
              <th>Location</th>
              <th>Confidence</th>
              <th>Risk flag</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="ciq-row--skeleton">
                  <td><span className="ciq-skeleton" style={{ width: "70%" }} /></td>
                  <td><span className="ciq-skeleton" style={{ width: "45%" }} /></td>
                  <td><span className="ciq-skeleton" style={{ width: "55%" }} /></td>
                  <td><span className="ciq-skeleton" style={{ width: "40%" }} /></td>
                </tr>
              ))}

            {!loading && filteredClauses.length === 0 && (
              <tr>
                <td colSpan={4} className="ciq-empty">
                  <p className="ciq-empty__title">No clauses match here.</p>
                  <p className="ciq-empty__subtitle">
                    {clauses.length === 0
                      ? "This contract hasn't been through extraction yet, or nothing was found."
                      : "Try a different search term, or clear the search to see everything."}
                  </p>
                </td>
              </tr>
            )}

            {!loading &&
              filteredClauses.map((c) => {
                const risk = RISK_META[normalizeRisk(c.risk_level)];
                const confidence = formatConfidence(c.confidence);
                const isExpanded = expandedId === c.id;
                return (
                  <Fragment key={c.id}>
                    <tr
                      key={c.id}
                      className="ciq-row"
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    >
                      <td className="ciq-cell--type">{c.clause_type}</td>
                      <td className="ciq-cell--mono">{c.section_ref || "—"}</td>
                      <td className="ciq-cell--mono">
                        {confidence !== null ? `${confidence}%` : "—"}
                      </td>
                      <td>
                        {risk ? (
                          <span className={`ciq-risk-badge ${risk.className}`}>
                            {risk.label}
                          </span>
                        ) : (
                          <span className="ciq-risk-badge">Unflagged</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${c.id}-detail`} className="ciq-row-detail">
                        <td colSpan={4}>
                          <p>{c.text || "No clause text was captured for this entry."}</p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="ciq-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="ciq-modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAddClause}>
              <label className="ciq-field">
                <span>Clause type</span>
                <input
                  type="text"
                  required
                  value={form.clause_type}
                  onChange={(e) => handleFormChange("clause_type", e.target.value)}
                  placeholder="e.g. Limitation of liability"
                />
              </label>
              <label className="ciq-field">
                <span>Location</span>
                <input
                  type="text"
                  value={form.section_ref}
                  onChange={(e) => handleFormChange("section_ref", e.target.value)}
                  placeholder="e.g. Section 8.2"
                />
              </label>
              <div className="ciq-field-row">
                <label className="ciq-field">
                  <span>Confidence (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.confidence}
                    onChange={(e) => handleFormChange("confidence", e.target.value)}
                    placeholder="0–100"
                  />
                </label>
                <label className="ciq-field">
                  <span>Risk flag</span>
                  <select
                    value={form.risk_flag}
                    onChange={(e) => handleFormChange("risk_flag", e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </div>
              <label className="ciq-field">
                <span>Clause text</span>
                <textarea
                  rows={4}
                  value={form.text}
                  onChange={(e) => handleFormChange("text", e.target.value)}
                  placeholder="Paste or type the clause text…"
                />
              </label>
              <div className="ciq-modal__actions">
                <button
                  type="button"
                  className="ciq-btn ciq-btn--ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="ciq-btn ciq-btn--primary" disabled={submitting}>
                  {submitting ? "Saving…" : "Save clause"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}