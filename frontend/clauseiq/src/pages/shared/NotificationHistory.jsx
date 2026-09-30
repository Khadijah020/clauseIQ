import { useEffect, useState } from "react";
import api from "../../api/axios";
import "../reviewer/clauseiq.css";

export default function NotificationHistory() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/notifications").then((res) => {
      setNotifications(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p style={{ padding: "2rem" }}>Loading...</p>;

  return (
    <div className="ciq-clauses-page">
      <h1 className="ciq-page-title">Notifications</h1>
      {notifications.length === 0 && (
        <div className="ciq-table-card"><p className="ciq-empty">No notifications yet.</p></div>
      )}
      {notifications.map((n) => (
        <div key={n.id} className="ciq-table-card" style={{ padding: 16, marginBottom: 10 }}>
          <p style={{ margin: 0 }}>{n.message}</p>
          <span style={{ fontSize: 12, color: "#69707e" }}>
            {new Date(n.created_at).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}