import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "../reviewer/clauseiq.css";

export default function ContractSummary() {
  const { contractId } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await api.get(`/api/contracts/${contractId}`);
      console.log("Contract data:", res.data);
      console.log("Summary:", res.data.summary);

      setContract(res.data);
    } catch (err) {
      console.error("Failed to load contract:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [contractId]);

  async function handleGenerate() {
    try {
      setGenerating(true);

      const res = await api.post(
        "/api/ai/summarize",
        null,
        { params: { contract_id: contractId } }
      );

      console.log("Summary response:", res.data);

      await load();
    } catch (err) {
      console.error("Failed to generate summary:", err);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <p style={{ padding: "2rem" }}>Loading...</p>;
  }

  if (!contract) {
    return <p style={{ padding: "2rem" }}>Contract not found.</p>;
  }

  return (
    <div className="ciq-clauses-page">
      <button
        className="ciq-btn ciq-btn--ghost"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div
        className="ciq-table-card"
        style={{
          padding: 24,
          marginTop: 16,
        }}
      >
        <h1 style={{ marginTop: 0 }}>
          {contract.title}
        </h1>

        {contract.summary ? (
          <>
            <h2 style={{ marginTop: 24 }}>
              AI Summary
            </h2>

            <p
              style={{
                lineHeight: 1.7,
                whiteSpace: "pre-line",
              }}
            >
              {contract.summary}
            </p>

            <button
              className="ciq-btn ciq-btn--ghost"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating
                ? "Regenerating..."
                : "Regenerate Summary"}
            </button>
          </>
        ) : (
          <>
            <p>No summary has been generated yet.</p>

            <button
              className="ciq-btn ciq-btn--primary"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating
                ? "Generating..."
                : "Generate Summary"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}