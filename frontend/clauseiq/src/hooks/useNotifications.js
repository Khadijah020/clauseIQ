import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export function useNotifications() {
  const { user } = useAuth();
  const [liveNotifications, setLiveNotifications] = useState([]);

  useEffect(() => {
    console.log("useNotifications effect running, user:", user);

    if (!user?.id) {
      console.log("No user ID, skipping WebSocket");
      return;
    }

    const ws = new WebSocket(
      `ws://localhost:8000/ws/notifications/${user.id}`
    );

    ws.onopen = () => {
      console.log("Notification WebSocket connected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Notification received:", data);

      setLiveNotifications((prev) => [data, ...prev]);
    };

    ws.onerror = (error) => {
      console.error("Notification WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("Notification WebSocket closed");
    };

    return () => {
      console.log("Closing Notification WebSocket");
      ws.close();
    };
  }, [user?.id]);

  return liveNotifications;
}