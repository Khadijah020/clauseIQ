import { useAuth } from "../context/AuthContext";

export default function PlaceholderPage({ title, useCase }) {
  const { user } = useAuth();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>{title}</h1>
      {useCase && <p style={{ color: "#666" }}>Use Case {useCase}</p>}
      {user && (
        <p style={{ color: "#999", fontSize: "13px" }}>
          Logged in as {user.email} ({user.role})
        </p>
      )}
    </div>
  );
}