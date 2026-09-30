import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import "../../styles/tokens.css";

// Pipeline steps a contract moves through before a decision is reached.
// Approved / Changes Requested / Failed are outcomes, not steps, so they
// aren't listed here — they're shown via the seal and status text instead.
const STAGES = ["Processing", "Parsed", "Scored", "Pending review"];

// Keyed by the lowercase backend status string (matches enums.py exactly,
// including "failed" being lowercase while the rest are Title Case).
const STATUS_MAP = {
  processing: { stageIndex: 0, kind: "active" },
  parsed: { stageIndex: 1, kind: "active" },
  scored: { stageIndex: 2, kind: "active" },
  "pending review": { stageIndex: 4, kind: "success" },  // ← changed from "active"
  approved: { stageIndex: 4, kind: "success" },
  "changes requested": { stageIndex: 4, kind: "attention" },
  failed: { stageIndex: 4, kind: "error" },
};

const TERMINAL_KINDS = ["success", "attention", "error"];

function resolveStage(status) {
  const key = (status || "").toLowerCase();
  return STATUS_MAP[key] || { stageIndex: 0, kind: "active" };
}

function Seal({ kind }) {
  return (
    <svg className="seal" viewBox="0 0 108 108" aria-hidden="true">
      <circle
        className={`seal-ring ${kind === "active" ? "" : "seal-ring--resolved"}`}
        cx="54"
        cy="54"
        r="48"
      />
      {kind === "active" && (
        <circle className="seal-ring--active" cx="54" cy="54" r="48" />
      )}
      {kind === "success" && (
        <path className="seal-mark seal-mark--success" d="M36 56 L48 68 L74 40" />
      )}
      {kind === "error" && (
        <>
          <path className="seal-mark seal-mark--error" d="M40 40 L68 68" />
          <path className="seal-mark seal-mark--error" d="M68 40 L40 68" />
        </>
      )}
      {kind === "attention" && (
        <>
          <path className="seal-mark seal-mark--attention" d="M54 34 L54 62" />
          <circle className="seal-dot--attention" cx="54" cy="76" r="3" />
        </>
      )}
    </svg>
  );
}

export default function ProcessingStatus() {
  const { contractId } = useParams();
  const [status, setStatus] = useState("Processing");
  const [pollError, setPollError] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/contracts/${contractId}`);
        setStatus(res.data.status);
        setPollError(false);
        const { kind } = resolveStage(res.data.status);
        if (TERMINAL_KINDS.includes(kind)) clearInterval(interval);
      } catch (err) {
        setPollError(true);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [contractId]);

  const { stageIndex: currentIndex, kind } = resolveStage(status);

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <h1 className="page-heading">Document processing</h1>
        <p className="page-subhead">Tracking contract #{contractId}.</p>
        <hr className="rule" />

        <div className="case-card status-card">
          <Seal kind={kind} />
          <p className="status-label">{status}</p>
          <p className="status-sublabel">
  {kind === "active" && "This can take a few minutes."}
  {kind === "attention" && "This contract needs changes before it can be approved."}
  {kind === "error" && "Review could not be completed."}
  {kind === "success" &&
    (status.toLowerCase() === "pending review"
      ? "AI processing complete — waiting for reviewer."
      : "Review complete.")}
</p>

          <ul className="stage-list">
            {STAGES.map((stage, i) => (
              <li
                key={stage}
                className={
                  i < currentIndex
                    ? "is-done"
                    : i === currentIndex
                    ? "is-current"
                    : ""
                }
              >
                <span className="stage-dot" />
                {stage}
              </li>
            ))}
          </ul>

          {pollError && (
            <p className="error-banner" style={{ marginTop: "1.5rem", width: "100%" }}>
              Losing connection to the server. Retrying every 2 seconds.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}