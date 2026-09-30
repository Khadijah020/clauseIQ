import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import "./clauseiq.css";

export default function VersionComparison() {
  const { contractId } = useParams();
  const [versions, setVersions] = useState([]);
  const [versionA, setVersionA] = useState("");
  const [versionB, setVersionB] = useState("");
  const [changes, setChanges] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/api/contracts/${contractId}/versions`).then((res) => setVersions(res.data));
  }, [contractId]);

  async function handleCompare() {
    setLoading(true);
    const res = await api.post("/api/ai/compare-versions", null, {
      params: { version_a_id: versionA, version_b_id: versionB },
    });
    setChanges(res.data.changes);
    setLoading(false);
  }

  const impactColor = { increased: "#a23b3b", decreased: "#3f7a56", neutral: "#69707e" };

  return (
    <div className="ciq-clauses-page">
      <h1>Version Comparison</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <select value={versionA} onChange={(e) => setVersionA(e.target.value)}>
          <option value="">Select version A</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>v{v.version}</option>
          ))}
        </select>
        <select value={versionB} onChange={(e) => setVersionB(e.target.value)}>
          <option value="">Select version B</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>v{v.version}</option>
          ))}
        </select>
        <button
          className="ciq-btn ciq-btn--primary"
          onClick={handleCompare}
          disabled={!versionA || !versionB || loading}
        >
          {loading ? "Comparing..." : "Compare"}
        </button>
      </div>

      {changes && (
        <div className="ciq-table-card">
          <table className="ciq-table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Change Type</th>
                <th>Risk Impact</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {changes.length === 0 && (
                <tr><td colSpan={4} className="ciq-empty">No meaningful changes detected.</td></tr>
              )}
              {changes.map((c, i) => (
                <tr key={i}>
                  <td>{c.section}</td>
                  <td>{c.change_type}</td>
                  <td style={{ color: impactColor[c.risk_impact], fontWeight: 600 }}>
                    {c.risk_impact}
                  </td>
                  <td>{c.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}