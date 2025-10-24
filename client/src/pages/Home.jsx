import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import socket from "../utils/socket";
console.log("Socket ID:", socket.id);

const Home = () => {
  const [username, setUsername] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [socketReady, setSocketReady] = useState(false)
  const [connecting, setConnecting] = useState(true);

useEffect(() => {
  const checkSocket = setInterval(() => {
    if (socket.connected && socket.id) {
      console.log('Socket connected:', socket.id);
      setSocketReady(true);
      setConnecting(false);
      clearInterval(checkSocket);
    }
  }, 500); // Retry every 500ms

  return () => clearInterval(checkSocket);
}, []);

  const navigate = useNavigate();

  const handleCreateSession = async () => {
    if (!username || !sessionId) return;
    if (!socket.id) {
      alert("Socket not ready yet. Try again in a moment.");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/session/create", {
        username,
        sessionId,
        socketId: socket.id,
      });
      console.log("Creating session with:", {
        username,
        sessionId,
        socketId: socket.id,
      });

      socket.emit("joinSession", { sessionId });
      navigate(`/session/${sessionId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create session");
    }
  };

  const handleJoinSession = async () => {
    if (!username || !sessionId) return;

    try {
      const res = await axios.post("http://localhost:5000/api/session/join", {
        username,
        sessionId,
        socketId: socket.id,
      });
      console.log("Creating session with:", {
        username,
        sessionId,
        socketId: socket.id,
      });

      socket.emit("joinSession", { sessionId });
      navigate(`/session/${sessionId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to join session");
    }
  };
  return (
    <div style={{ padding: "2rem" }}>
      <h2>Guessing Game</h2>
      <input
        type="text"
        placeholder="Enter your username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="text"
        placeholder="Enter session ID"
        value={sessionId}
        onChange={(e) => setSessionId(e.target.value)}
      />
      {connecting && <p>Connecting to server...</p>}

<button onClick={handleCreateSession} disabled={!socketReady}>
  Create Session
</button>
<button onClick={handleJoinSession} disabled={!socketReady}>
  Join Session
</button>

    </div>
  );
};

export default Home;
