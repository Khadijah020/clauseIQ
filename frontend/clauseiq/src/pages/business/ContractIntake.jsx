import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "../../styles/tokens.css";

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ContractIntake() {
  const [title, setTitle] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [contractType, setContractType] = useState("");
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  function handleFileSelect(selected) {
    if (selected && selected.type === "application/pdf") {
      setFile(selected);
      setError("");
    } else if (selected) {
      setError("Only PDF files are accepted.");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Attach a contract PDF before submitting.");
      return;
    }

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
      setError("Upload failed. Check the file and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <h1 className="page-heading">Contract intake</h1>
        <p className="page-subhead">
          Add the contract details and attach the signed PDF to start review.
        </p>
        <hr className="rule" />

        <div className="case-card">
          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                placeholder="e.g. Master Services Agreement"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="counterparty">Counterparty</label>
              <input
                id="counterparty"
                type="text"
                placeholder="e.g. Northwind Logistics Inc."
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="contractType">Contract type</label>
              <input
                id="contractType"
                type="text"
                placeholder="e.g. NDA, MSA, Lease"
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label>Contract file</label>
              <div
                className={`dropzone ${isDragging ? "is-dragging" : ""} ${
                  file ? "has-file" : ""
                }`}
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="dropzone__file">
                    <span className="dropzone__file-name">{file.name}</span>
                    <span className="dropzone__file-size">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      className="dropzone__remove"
                      aria-label="Remove file"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <p className="dropzone__prompt">
                    <strong>Choose a PDF</strong> or drag it here
                  </p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  hidden
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />
              </div>
            </div>

            {error && <p className="error-banner">{error}</p>}

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Uploading…" : "Upload contract"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}