import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import "../reviewer/clauseiq.css";

const SUGGESTED_QUESTIONS = [
  "What's the termination notice period?",
  "Does this contract auto-renew?",
  "Summarize the payment terms",
];

export default function ContractQA() {
  const { contractId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function sendQuestion(question) {
    if (!question.trim() || sending) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await api.post("/api/ai/chat", null, {
        params: { contract_id: contractId, question },
      });
      setMessages((prev) => [...prev, { role: "assistant", text: res.data.answer }]);
    } catch {
      setError("Couldn't get a response. Try asking again.");
    } finally {
      setSending(false);
    }
  }

  function handleSend(e) {
    e.preventDefault();
    sendQuestion(input);
  }

  return (
    <div className="ciq-clauses-page cq-page">
      <style>{`
        .cq-page {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 64px);
        }

        .cq-header {
          margin-bottom: 16px;
        }

        .cq-subtitle {
          font-size: 0.88rem;
          color: var(--ciq-muted);
          margin: 4px 0 0;
        }

        .cq-thread {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          border: 1px solid var(--ciq-line);
          border-radius: 12px;
          background: var(--ciq-surface);
          padding: 20px 20px 8px;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
        }

        .cq-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--ciq-muted);
          padding: 20px;
        }

        .cq-empty__icon {
          width: 38px;
          height: 38px;
          margin-bottom: 14px;
          opacity: 0.5;
        }

        .cq-empty__title {
          font-family: "Source Serif 4", serif;
          font-size: 1rem;
          color: var(--ciq-text);
          margin: 0 0 4px;
        }

        .cq-empty__text {
          font-size: 0.85rem;
          margin: 0 0 18px;
          max-width: 340px;
        }

        .cq-suggestions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
        }

        .cq-suggestion-chip {
          font-size: 0.8rem;
          font-family: inherit;
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid var(--ciq-line);
          background: var(--ciq-surface);
          color: var(--ciq-text);
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .cq-suggestion-chip:hover {
          background: #f0efe9;
          border-color: var(--ciq-muted);
        }

        .cq-row {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          align-items: flex-start;
        }

        .cq-row--user {
          flex-direction: row-reverse;
        }

        .cq-avatar {
          flex: 0 0 30px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.7rem;
          font-weight: 600;
          color: #fff;
        }

        .cq-avatar--user {
          background: var(--ciq-ink, #1c2a46);
        }

        .cq-avatar--assistant {
          background: var(--ciq-gold, #a9812f);
        }

        .cq-bubble-col {
          display: flex;
          flex-direction: column;
          max-width: 66%;
        }

        .cq-row--user .cq-bubble-col {
          align-items: flex-end;
        }

        .cq-bubble {
          padding: 11px 15px;
          border-radius: 14px;
          font-size: 0.9rem;
          line-height: 1.55;
          white-space: pre-wrap;
        }

        .cq-bubble--user {
          background: var(--ciq-ink, #1c2a46);
          color: #fff;
          border-bottom-right-radius: 4px;
        }

        .cq-bubble--assistant {
          background: #f0efe9;
          color: var(--ciq-text);
          border-bottom-left-radius: 4px;
        }

        .cq-typing {
          display: inline-flex;
          gap: 4px;
          padding: 4px 2px;
        }

        .cq-typing span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--ciq-muted);
          animation: cq-bounce 1.1s infinite ease-in-out;
        }

        .cq-typing span:nth-child(2) { animation-delay: 0.15s; }
        .cq-typing span:nth-child(3) { animation-delay: 0.3s; }

        @keyframes cq-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }

        .cq-error {
          padding: 10px 16px;
          border-radius: 10px;
          background: var(--ciq-risk-medium-bg, #fbeee0);
          color: var(--ciq-risk-medium, #94590f);
          font-size: 0.84rem;
          margin-bottom: 12px;
        }

        .cq-form {
          display: flex;
          gap: 10px;
          flex: 0 0 auto;
        }

        .cq-input {
          flex: 1;
          padding: 13px 16px;
          font-size: 0.92rem;
          font-family: inherit;
          border: 1px solid var(--ciq-line);
          border-radius: 10px;
          background: var(--ciq-surface);
          color: var(--ciq-text);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .cq-input:focus {
          outline: none;
          border-color: var(--ciq-ink, #2c2a26);
          box-shadow: 0 0 0 3px rgba(44, 42, 38, 0.08);
        }

        .cq-send-btn {
          padding: 0 22px;
          font-size: 0.9rem;
          font-weight: 600;
          font-family: inherit;
          border: none;
          border-radius: 10px;
          background: var(--ciq-ink, #1c2a46);
          color: #fff;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }

        .cq-send-btn:disabled {
          opacity: 0.4;
          cursor: default;
        }

        .cq-send-btn:not(:disabled):hover {
          opacity: 0.88;
        }
      `}</style>

      <div className="cq-header">
        <h1 className="ciq-page-title">Contract Q&A</h1>
        <p className="cq-subtitle">Ask anything about this contract, in plain English.</p>
      </div>

      <div className="cq-thread" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="cq-empty">
            <svg className="cq-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="cq-empty__title">Ask a question about this contract</p>
            <p className="cq-empty__text">
              Chatbot will read through the contract and answer in plain language, with the
              relevant clauses in mind.
            </p>
            <div className="cq-suggestions">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="cq-suggestion-chip"
                  onClick={() => sendQuestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`cq-row ${m.role === "user" ? "cq-row--user" : ""}`}>
            <div className={`cq-avatar cq-avatar--${m.role}`}>
              {m.role === "user" ? "You" : "AI"}
            </div>
            <div className="cq-bubble-col">
              <div className={`cq-bubble cq-bubble--${m.role}`}>{m.text}</div>
            </div>
          </div>
        ))}

        {sending && (
          <div className="cq-row">
            <div className="cq-avatar cq-avatar--assistant">AI</div>
            <div className="cq-bubble-col">
              <div className="cq-bubble cq-bubble--assistant">
                <span className="cq-typing">
                  <span></span><span></span><span></span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="cq-error">{error}</div>}

      <form onSubmit={handleSend} className="cq-form">
        <input
          className="cq-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button className="cq-send-btn" type="submit" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}