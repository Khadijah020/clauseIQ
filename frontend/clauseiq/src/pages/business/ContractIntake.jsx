import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

export default function ContractIntake() {
  const [title, setTitle] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [contractType, setContractType] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("counterparty", counterparty);
    formData.append("contract_type", contractType);
    formData.append("file", file);

    try {
      const res = await api.post("/api/contracts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/business/processing/${res.data.id}`);
    } catch (err) {
      setError("Upload failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Contract Intake</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input placeholder="Counterparty" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} required />
        <input placeholder="Contract type" value={contractType} onChange={(e) => setContractType(e.target.value)} required />
        <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} required />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}