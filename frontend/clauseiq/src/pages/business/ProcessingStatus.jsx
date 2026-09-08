import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/client";

export default function ProcessingStatus() {
  const { contractId } = useParams();
  const [status, setStatus] = useState("Processing");

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await api.get(`/api/contracts/${contractId}`);
      setStatus(res.data.status);
      if (res.data.status !== "Processing") clearInterval(interval);
    }, 2000);

    return () => clearInterval(interval);
  }, [contractId]);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Document Processing</h1>
      <p>Status: {status}</p>
    </div>
  );
}