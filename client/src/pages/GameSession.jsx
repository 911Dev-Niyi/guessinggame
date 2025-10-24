import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import socket from "../utils/socket";
import axios from "axios";
import Lobby from "../components/Lobby";
import GameBoard from "../components/GameBoard";
import Leaderboard from "../components/LeaderBoard";

const GameSession = () => {
  const { id: sessionId } = useParams();
  const [players, setPlayers] = useState([]);
  const [question, setQuestion] = useState("");
  const [isMaster, setIsMaster] = useState(false);
  const [guess, setGuess] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [roundInfo, setRoundInfo] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [roundResult, setRoundResult] = useState("");
  const [playerId, setPlayerId] = useState(() =>
    localStorage.getItem("playerId")
  );
  const timerRef = useRef(null);

  useEffect(() => {
    // Join the session room
    socket.emit("joinSession", { sessionId });

    const fetchSession = async () => {
      const res = await axios.get(
        `http://localhost:5000/api/session/${sessionId}`
      );
      setPlayers(res.data.players);

      // After fetching the session:
const me = res.data.players.find((p) => String(p._id) === String(playerId));

if (me) {
  // Keep identity stable; only update flags that can change
  setIsMaster(Boolean(me.isMaster));
} else {
  // You (this tab) no longer exist in the session
  console.warn("Player not found; keeping existing playerId:", playerId);
  // Optional UX: notify and redirect
  alert("You are no longer in this session.");
  window.location.href = "/";
}

    };

    fetchSession();

    // Real-time: someone joined/ left
    socket.on("playersUpdated", ({ players }) => {
      setPlayers(Array.isArray(players) ? players : []);
    });

    // Game started
    socket.on("gameStarted", (data) => {
      const endTime = new Date(data.timerEndsAt).getTime();
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) clearInterval(timerRef.current);
      }, 1000);
    });

    socket.on("roundWon", ({ winner, answer }) => {
      clearInterval(timerRef.current);
      setTimeLeft(null);
      setRoundResult({ winner, answer }); // ✅ this tells the UI the round is done
      alert(`${winner} guessed correctly! The answer was '${answer}'`);
    });

    // Round ended with no winner
    socket.on("roundEndedNoWinner", ({ answer }) => {
      alert(`Time's up! The answer was "${answer}".`);
      setRoundResult({ winner: null, answer, type: "timeout" });
      setTimeLeft(null);
    });

    // Leaderboard update
    socket.on("leaderboardUpdate", (data) => {
      setLeaderboard(data);
    });
    socket.on("sessionDeletedDueToTimeout", () => {
      alert("Session expired due to inactivity.");
      window.location.href = "/";
    });

    socket.on("sessionDeleted", () => {
      alert("Session has ended.");
      window.location.href = "/";
    });

    // Cleanup on unmount
    return () => {
      socket.off("playerJoined");
      socket.off("gameStarted");
      socket.off("roundWon");
      socket.off("roundEndedNoWinner");
      socket.off("leaderboardUpdate");
      socket.off("sessionDeletedDueToTimeout");
      socket.off("sessionDeleted");
    };
  }, [sessionId]);

  const handleStartGame = async () => {
    if (!playerId) {
      alert("Player not initialized. Please wait or rejoin.");
      return;
    }

    const questionInput = prompt("Enter your question:");
    const answerInput = prompt("Enter the correct answer:");

    try {
      await axios.post("http://localhost:5000/api/session/start", {
        sessionId,
        playerId, // Mongo _id from state/localStorage
        question: questionInput,
        answer: answerInput,
      });
    } catch (err) {
      alert("Failed to start game");
    }
  };

  const handleSubmitGuess = async () => {
    if (!playerId) {
      alert("Player not initialized yet. Please wait a moment and try again.");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/session/guess", {
        sessionId,
        playerId,
        guess,
      });
      setGuess("");
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg === "Round already won by another player") {
        console.log("Round already endee, ignoring guess");
        return;
      }
      alert(err.response?.data?.error || "Guess failed");
    }
  };

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "600px",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2>Game Session: {sessionId}</h2>
      {roundResult && (
        <div
          style={{ background: "#eee", padding: "1rem", marginBottom: "1rem" }}
        >
          {roundResult.type === "win"
            ? `${roundResult.winner} guessed correctly! Answer: "${roundResult.answer}"`
            : `Time's up! The answer was "${roundResult.answer}"`}
        </div>
      )}

      <Lobby players={players} currentSocketId={socket.id} />

      {players.some(
        (p) => String(p._id) === String(playerId) && p.isMaster
      ) && <button onClick={handleStartGame}>Start Round</button>}

      <GameBoard
        question={question}
        guess={guess}
        setGuess={setGuess}
        handleSubmitGuess={handleSubmitGuess}
        timeLeft={timeLeft}
        roundResult={roundResult}
      />

      <Leaderboard leaderboard={leaderboard} />

      <button
        style={{
          marginTop: "1rem",
          background: "red",
          color: "white",
          padding: "0.5rem 1rem",
        }}
        onClick={async () => {
          try {
            console.log(
              "Leaving with playerId:",
              playerId,
              "sockeId:",
              socket.id
            );
            await axios.post("http://localhost:5000/api/session/leave", {
              sessionId,
              playerId, // Mongo _id from localstorage
            });
          } catch (e) {
            console.error("Leave failed");
          } finally {
            localStorage.removeItem("playerId");
            window.location.href = "/";
          }
        }}
      >
        Leave Session
      </button>
    </div>
  );
};

export default GameSession;
