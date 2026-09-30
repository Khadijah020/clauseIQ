import { useEffect, useState } from "react";
import api from "../../api/axios";
import "../reviewer/clauseiq.css";

export default function PortfolioAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/analytics/portfolio").then((res) => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p style={{ padding: "2rem" }}>Loading...</p>;

  const maxCount = Math.max(...data.clause_type_distribution.map((c) => c.count), 1);

  return (
    <div className="ciq-clauses-page">
      <h1 className="ciq-page-title">Portfolio Risk Analytics</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        {[
          ["Total Contracts", data.total_contracts],
          ["Avg Risk Score", data.average_risk_score ?? "—"],
          ["Renewals (90d)", data.upcoming_renewals_90d],
          ["High-Risk %", `${data.high_risk_percentage}%`],
        ].map(([label, value]) => (
          <div key={label} className="ciq-table-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: "#69707e" }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="ciq-table-card" style={{ padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Clause Type Distribution</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 180 }}>
          {data.clause_type_distribution.map((c) => (
            <div key={c.clause_type} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  background: "#1c2a46",
                  height: `${(c.count / maxCount) * 140}px`,
                  borderRadius: "4px 4px 0 0",
                }}
              />
              <div style={{ fontSize: 10, marginTop: 4, color: "#69707e" }}>{c.clause_type}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}