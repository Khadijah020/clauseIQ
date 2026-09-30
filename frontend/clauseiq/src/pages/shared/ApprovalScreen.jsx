import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import "../reviewer/clauseiq.css";

export default function ApprovalScreen() {
  const { contractId } = useParams();
  const { user } = useAuth();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  function load() {
    api.get(`/api/contracts/${contractId}`).then((res) => {
      setContract(res.data);
      setLoading(false);
    });
  }

  useEffect(load, [contractId]);

  async function handleDecision(newStatus) {
    setUpdating(true);
    await api.put(`/api/contracts/${contractId}/status`, null, { params: { status: newStatus } });
    setUpdating(false);
    load();
  }

  if (loading) return <p style={{ padding: "2rem" }}>Loading...</p>;

  return (
    <div className="ciq-clauses-page">
      <div className="ciq-table-card" style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>{contract.title}</h1>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#69707e" }}>Status</div>
          <strong>{contract.status}</strong>
        </div>

        {contract.status === "Pending Review" && user.role === "legal_reviewer" && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="ciq-btn ciq-btn--primary"
              disabled={updating}
              onClick={() => handleDecision("Approved")}
            >
              Approve
            </button>
            <button
              className="ciq-btn ciq-btn--ghost"
              disabled={updating}
              onClick={() => handleDecision("Changes Requested")}
            >
              Request Changes
            </button>
          </div>
        )}

        {contract.status === "Approved" && (
          <p style={{ color: "#3f7a56", fontWeight: 600 }}>
            ✓ Approved — routed for signature (mock)
          </p>
        )}

        {contract.status === "Changes Requested" && (
          <p style={{ color: "#a9782c", fontWeight: 600 }}>
            Changes requested — back to negotiation
          </p>
        )}
      </div>
    </div>
  );
}