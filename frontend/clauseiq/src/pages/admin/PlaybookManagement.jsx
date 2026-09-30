import { useEffect, useState } from "react";
import api from "../../api/axios";
import "../reviewer/clauseiq.css";

export default function PlaybookManagement() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  function loadRules() {
    setLoading(true);
    setError(null);
    api
      .get("/api/admin/playbook")
      .then((res) => setRules(res.data ?? []))
      .catch(() => setError("Couldn't load the playbook. Try refreshing."))
      .finally(() => setLoading(false));
  }

  async function saveRule(clauseType, standardLanguage, riskThreshold) {
    setSaving(true);
    try {
      await api.put(`/api/admin/playbook/${clauseType}`, {
        standard_language: standardLanguage,
        risk_threshold: parseFloat(riskThreshold),
      });
      setEditing(null);
      loadRules();
    } catch {
      setError("Couldn't save that rule. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ciq-playbook-page">
      <div className="ciq-page-header">
        <div>
          <p className="ciq-page-header__eyebrow">Admin</p>
          <h1 className="ciq-page-title">Clause Playbook</h1>
          <p className="ciq-page-header__subtitle">
            Standard language and risk thresholds used to auto-score incoming
            contracts.
          </p>
        </div>
        {!loading && rules.length > 0 && (
          <span className="ciq-page-header__count">
            {rules.length} clause {rules.length === 1 ? "type" : "types"}
          </span>
        )}
      </div>

      {error && <div className="ciq-alert ciq-alert--error">{error}</div>}

      <div className="ciq-playbook-grid">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="ciq-playbook-card">
              <span
                className="ciq-skeleton"
                style={{ width: "40%", height: 16, marginBottom: 14 }}
              />
              <span
                className="ciq-skeleton"
                style={{ width: "100%", height: 12, marginBottom: 6 }}
              />
              <span
                className="ciq-skeleton"
                style={{ width: "80%", height: 12 }}
              />
            </div>
          ))}

        {!loading && rules.length === 0 && !error && (
          <div className="ciq-empty-state">
            <p className="ciq-empty-state__title">No playbook rules yet.</p>
            <p className="ciq-empty-state__subtitle">
              Add clause types and standard language to start auto-scoring
              contracts.
            </p>
          </div>
        )}

        {!loading &&
          rules.map((r) =>
            editing === r.clause_type ? (
              <EditCard
                key={r.id}
                rule={r}
                saving={saving}
                onSave={saveRule}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <ViewCard
                key={r.id}
                rule={r}
                onEdit={() => setEditing(r.clause_type)}
              />
            ),
          )}
      </div>
    </div>
  );
}

function ViewCard({ rule, onEdit }) {
  return (
    <div className="ciq-playbook-card">
      <div className="ciq-playbook-card__head">
        <h2 className="ciq-playbook-card__title">{rule.clause_type}</h2>
        <span className="ciq-playbook-threshold">
          Threshold {rule.risk_threshold}
        </span>
      </div>
      <p className="ciq-playbook-card__text">{rule.standard_language}</p>
      <button
        type="button"
        className="ciq-btn ciq-btn--ghost ciq-btn--sm"
        onClick={onEdit}
      >
        Edit
      </button>
    </div>
  );
}

function EditCard({ rule, saving, onSave, onCancel }) {
  const [text, setText] = useState(rule.standard_language);
  const [threshold, setThreshold] = useState(rule.risk_threshold);

  return (
    <div className="ciq-playbook-card ciq-playbook-card--editing">
      <div className="ciq-playbook-card__head">
        <h2 className="ciq-playbook-card__title">{rule.clause_type}</h2>
      </div>

      <label className="ciq-field">
        <span className="ciq-field__label">Standard language</span>
        <textarea
          className="ciq-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />
      </label>

      <label className="ciq-field ciq-field--inline">
        <span className="ciq-field__label">Risk threshold</span>
        <input
          className="ciq-input ciq-input--number"
          type="number"
          step="0.01"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
      </label>

      <div className="ciq-playbook-card__actions">
        <button
          type="button"
          className="ciq-btn ciq-btn--ghost ciq-btn--sm"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="ciq-btn ciq-btn--primary ciq-btn--sm"
          onClick={() => onSave(rule.clause_type, text, threshold)}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}