import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "../reviewer/clauseiq.css";

const EXAMPLE_QUERIES = [
  "contracts with auto-renewal clauses",
  "agreements that limit our liability",
  "vendors with 90-day termination notice",
];

function relevanceLabel(score) {
  if (score == null) return null;
  const pct = score <= 1 ? Math.round(score * 100) : Math.round(score);
  return `${pct}% match`;
}

export default function RepositorySearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function runSearch(q) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/ai/search-contracts", null, {
        params: { query: trimmed },
      });
      setResults(res.data ?? []);
    } catch {
      setError("Something went wrong while searching. Try again.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    runSearch(query);
  }

  function handleExampleClick(example) {
    setQuery(example);
    runSearch(example);
  }

  const hasSearched = results !== null || loading;

  return (
    <div className="ciq-clauses-page">
      <style>{`
        .cs-header {
          margin-bottom: 22px;
        }

        .cs-subtitle {
          font-size: 0.92rem;
          color: var(--ciq-muted);
          margin: 6px 0 0;
        }

        .cs-search-form {
          margin-bottom: 24px;
        }

        .cs-search-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .cs-search-icon {
          position: absolute;
          left: 16px;
          width: 18px;
          height: 18px;
          color: var(--ciq-muted);
          pointer-events: none;
        }

        .cs-search-input {
          width: 100%;
          padding: 15px 110px 15px 46px;
          font-size: 0.95rem;
          font-family: inherit;
          border: 1px solid var(--ciq-line);
          border-radius: 10px;
          background: var(--ciq-surface);
          color: var(--ciq-text);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .cs-search-input:focus {
          outline: none;
          border-color: var(--ciq-ink, #2c2a26);
          box-shadow: 0 0 0 3px rgba(44, 42, 38, 0.08);
        }

        .cs-search-submit {
          position: absolute;
          right: 6px;
          padding: 9px 16px;
          font-size: 0.85rem;
          font-weight: 600;
          font-family: inherit;
          border: none;
          border-radius: 7px;
          background: var(--ciq-ink, #2c2a26);
          color: #fff;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }

        .cs-search-submit:disabled {
          opacity: 0.4;
          cursor: default;
        }

        .cs-search-submit:not(:disabled):hover {
          opacity: 0.88;
        }

        .cs-examples {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
        }

        .cs-examples__label {
          font-size: 0.78rem;
          color: var(--ciq-muted);
          margin-right: 2px;
        }

        .cs-example-chip {
          font-size: 0.78rem;
          font-family: inherit;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--ciq-line);
          background: var(--ciq-surface);
          color: var(--ciq-text);
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .cs-example-chip:hover {
          background: #f0efe9;
          border-color: var(--ciq-muted);
        }

        .cs-idle {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 64px 20px;
          color: var(--ciq-muted);
        }

        .cs-idle__icon {
          width: 40px;
          height: 40px;
          margin-bottom: 14px;
          opacity: 0.5;
        }

        .cs-idle__title {
          font-family: "Source Serif 4", serif;
          font-size: 1.05rem;
          color: var(--ciq-text);
          margin: 0 0 4px;
        }

        .cs-idle__text {
          font-size: 0.86rem;
          margin: 0;
          max-width: 360px;
        }

        .cs-results-meta {
          font-size: 0.8rem;
          color: var(--ciq-muted);
          margin: 0 0 14px;
        }

        .cs-results {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cs-result-card {
          padding: 18px 20px;
          border: 1px solid var(--ciq-line);
          border-radius: 10px;
          background: var(--ciq-surface);
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
        }

        .cs-result-card:hover {
          border-color: var(--ciq-muted);
          box-shadow: 0 4px 14px rgba(20, 20, 20, 0.06);
          transform: translateY(-1px);
        }

        .cs-result-card__top {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 4px;
        }

        .cs-result-card__title-group {
          display: flex;
          align-items: baseline;
          gap: 8px;
          min-width: 0;
        }

        .cs-result-card__title {
          font-family: "Source Serif 4", serif;
          font-weight: 600;
          font-size: 1rem;
          color: var(--ciq-text);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cs-result-card__counterparty {
          font-size: 0.85rem;
          color: var(--ciq-muted);
          white-space: nowrap;
        }

        .cs-relevance-pill {
          flex-shrink: 0;
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.7rem;
          font-weight: 500;
          padding: 4px 9px;
          border-radius: 999px;
          background: var(--ciq-risk-low-bg, #e8f0e8);
          color: var(--ciq-risk-low, #3a6b3a);
          white-space: nowrap;
        }

        .cs-result-card__tags {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 8px 0 10px;
          font-size: 0.76rem;
        }

        .cs-result-card__clause-type {
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          color: var(--ciq-muted);
        }

        .cs-result-card__section {
          font-family: "IBM Plex Mono", monospace;
          color: var(--ciq-muted);
        }

        .cs-result-card__snippet {
          font-size: 0.88rem;
          line-height: 1.55;
          color: var(--ciq-text);
          margin: 0;
        }

        .cs-result-card__cta {
          display: inline-block;
          margin-top: 10px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--ciq-ink, #2c2a26);
        }

        .cs-skeleton-card {
          padding: 18px 20px;
          border: 1px solid var(--ciq-line);
          border-radius: 10px;
          background: var(--ciq-surface);
        }

        .cs-error {
          padding: 14px 18px;
          border-radius: 10px;
          background: var(--ciq-risk-medium-bg, #fbeee0);
          color: var(--ciq-risk-medium, #94590f);
          font-size: 0.88rem;
          margin-bottom: 16px;
        }
      `}</style>

      <div className="cs-header">
        <h1 className="ciq-page-title">Semantic Search</h1>
        <p className="cs-subtitle">
          Search across every contract in plain English.
        </p>
      </div>

      <form onSubmit={handleSearch} className="cs-search-form">
        <div className="cs-search-box">
          <svg className="cs-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="cs-search-input"
            placeholder="e.g. contracts with auto-renewal clauses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="cs-search-submit" disabled={loading || !query.trim()}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        {!hasSearched && (
          <div className="cs-examples">
            <span className="cs-examples__label">Try:</span>
            {EXAMPLE_QUERIES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="cs-example-chip"
                onClick={() => handleExampleClick(ex)}
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </form>

      {error && <div className="cs-error">{error}</div>}

      {!hasSearched && !error && (
        <div className="cs-idle">
          <svg className="cs-idle__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p className="cs-idle__title">Search your entire contract repository</p>
          <p className="cs-idle__text">
            Describe what you're looking for in your own words — clause types, obligations, risk
            terms, counterparties — and matching contracts will show up here.
          </p>
        </div>
      )}

      {loading && (
        <div className="cs-results">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`cs-skeleton-${i}`} className="cs-skeleton-card">
              <span className="ciq-skeleton" style={{ width: "40%", display: "block", marginBottom: 10 }} />
              <span className="ciq-skeleton" style={{ width: "25%", display: "block", marginBottom: 12 }} />
              <span className="ciq-skeleton" style={{ width: "90%", display: "block", marginBottom: 6 }} />
              <span className="ciq-skeleton" style={{ width: "70%", display: "block" }} />
            </div>
          ))}
        </div>
      )}

      {!loading && results && results.length === 0 && (
        <div className="cs-idle">
          <p className="cs-idle__title">No matching clauses found</p>
          <p className="cs-idle__text">Try rephrasing your search or using broader terms.</p>
        </div>
      )}

      {!loading && results && results.length > 0 && (
        <>
          <p className="cs-results-meta">
            {results.length} matching clause{results.length === 1 ? "" : "s"}
          </p>
          <div className="cs-results">
            {results.map((r) => (
              <div
                key={r.clause_id}
                className="cs-result-card"
                onClick={() => navigate(`/reviewer/contracts/${r.contract_id}/clauses`)}
              >
                <div className="cs-result-card__top">
                  <div className="cs-result-card__title-group">
                    <h3 className="cs-result-card__title">{r.contract_title}</h3>
                    {r.counterparty && (
                      <span className="cs-result-card__counterparty">— {r.counterparty}</span>
                    )}
                  </div>
                  {relevanceLabel(r.relevance) && (
                    <span className="cs-relevance-pill">{relevanceLabel(r.relevance)}</span>
                  )}
                </div>

                <div className="cs-result-card__tags">
                  {r.clause_type && (
                    <span className="cs-result-card__clause-type">{r.clause_type}</span>
                  )}
                  {r.section_ref && <span className="cs-result-card__section">{r.section_ref}</span>}
                </div>

                <p className="cs-result-card__snippet">{r.snippet}…</p>
                <span className="cs-result-card__cta">View clause →</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}