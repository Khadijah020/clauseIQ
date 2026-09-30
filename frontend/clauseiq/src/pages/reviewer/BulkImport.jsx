import { useState } from "react";
import api from "../../api/axios";
import "./clauseiq.css";

export default function BulkImport() {
  const [files, setFiles] = useState([]);
  const [contractType, setContractType] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [queuedIds, setQueuedIds] = useState(null);
  const [report, setReport] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData();
    for (const f of files) formData.append("files", f);
    formData.append("contract_type", contractType);
    formData.append("assigned_reviewer_id", reviewerId);

    const res = await api.post("/api/contracts/bulk", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setQueuedIds(res.data.contract_ids);
    setSubmitting(false);
  }

  async function checkReport() {
    const res = await api.get("/api/contracts/bulk/report", {
      params: { contract_ids: queuedIds.join(",") },
    });
    setReport(res.data);
  }

  return (
    <div className="ciq-clauses-page">
      <h1 className="ciq-page-title">Bulk Contract Import</h1>

      {!queuedIds && (
        <form onSubmit={handleSubmit} className="ciq-table-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#69707e" }}>
              Select Files (Multiple)
            </label>
            <input type="file" multiple accept=".pdf" onChange={(e) => setFiles(Array.from(e.target.files))} required />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#69707e" }}>
              Default Contract Type
            </label>
            <input value={contractType} onChange={(e) => setContractType(e.target.value)} required style={{ width: "100%", padding: 8 }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#69707e" }}>
              Assign Reviewer (User ID)
            </label>
            <input value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} required style={{ width: "100%", padding: 8 }} />
          </div>
          <button className="ciq-btn ciq-btn--primary" type="submit" disabled={submitting}>
            {submitting ? "Uploading..." : "Start Batch Analysis"}
          </button>
        </form>
      )}

      {queuedIds && !report && (
        <div className="ciq-table-card" style={{ padding: 24 }}>
          <p>{queuedIds.length} contracts queued for processing.</p>
          <button className="ciq-btn ciq-btn--primary" onClick={checkReport}>
            Check Batch Report
          </button>
        </div>
      )}

      {report && (
        <div className="ciq-table-card" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>Batch Report</h3>
          <p>Total: {report.total} · Processed: {report.processed}</p>
          <p>Average risk: {report.average_risk ?? "—"} · High-risk: {report.flagged_high_risk}</p>
          <button className="ciq-btn ciq-btn--ghost" onClick={checkReport}>Refresh</button>
        </div>
      )}
    </div>
  );
}