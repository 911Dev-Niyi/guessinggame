import React from "react";
import socket from "../utils/socket"; 

const Lobby = ({ players = [], currentSocketId }) => {
  if (players.length === 0) return <p>No players yet...</p>;

  return (
    <div>
      <h3>Lobby</h3>
      <ul>
        {players.map((p, i) => (
          <li key={i}>
            {p.username} {p.isMaster ? "(Game Master)" : ""}
            {p.socketId === currentSocketId ? " (You)" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
};


export default Lobby;
