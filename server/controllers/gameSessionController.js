import socket from "../../client/src/utils/socket.js";
import mongoose from "mongoose";
import GameSession from "../models/gameSession.js";
import Player from "../models/player.js";

//Create new session
export const createSession = async (req, res) => {
  try {
    const { sessionId, username, socketId } = req.body;
    console.log("Incoming request body:", req.body);

    // ✅ Validate before using the data
    if (!username || !sessionId || !socketId) {
      console.log("Missing fields:", { username, sessionId, socketId });
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Create player
    const newPlayer = await Player.create({
      username,
      socketId,
      isMaster: true,
    });

    // ✅ Create session
    const newSession = await GameSession.create({
      sessionId,
      players: [newPlayer._id],
      status: "waiting",
    });
    setTimeout(async () => {
      const session = await GameSession.findOne({ sessionId });
      if (session) {
        await GameSession.deleteOne({ sessionId });
        const io = req.app.get("socketio");
        io.to(sessionId).emit("sessionDeletedDueToTimeout");
      }
    }, 30 * 60 * 1000); // 30 minutes

    res.status(201).json({ session: newSession, player: newPlayer });
  } catch (err) {
    console.error("Create session error:", err);
    res.status(500).json({ error: "Failed to create session" });
  }
};

// Join an existing session
export const joinSession = async (req, res) => {
  try {
    const { sessionId, username, socketId } = req.body;
    console.log("Join request received:", req.body);

    if (!username || !sessionId || !socketId) {
      console.log("Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }
    const io = req.app.get("socketio");
    console.log("Looking for session...");
    const session = await GameSession.findOne({ sessionId });
    console.log("Session found:", session);

    if (!session || session.status !== "waiting") {
      console.log("Session not available for joining");
      return res.status(400).json({
        error: `Session with id ${sessionId} is not available for joining`,
      });
    }
    const existingPlayer = await Player.findOne({ socketId });
    if (existingPlayer) {
      if (!session.players.includes(existingPlayer._id)) {
        session.players.push(existingPlayer._id);
        await session.save();
      }
      const players = await Player.find({ _id: { $in: session.players } });
      io.to(sessionId).emit("playerJoined", { players });
      return res.status(200).json({ session, player: existingPlayer });
    }

    console.log("Creating new player...");
    const newPlayer = await Player.create({ username, socketId });
    console.log("New player created:", newPlayer);

    console.log("Adding player to session...");
    session.players.push(newPlayer._id);

    console.log("Saving session...");
    await session.save();

    console.log("Populating players...");
    const populatedPlayers = await Player.find({
      _id: { $in: session.players },
    });
    console.log("Populated players:", populatedPlayers);

    console.log("Emitting playerJoined...");
    io.to(sessionId).emit("playerJoined", {
      players: populatedPlayers,
    });

    console.log("Join successful");
    res.status(200).json({ session, player: newPlayer });
  } catch (err) {
    console.error("Join session error:", err); // Log the actual error
    res.status(500).json({ error: "Failed to join session" });
  }
};

export const startGame = async (req, res) => {
  try {
    const { sessionId, playerId, question, answer } = req.body;

    const session = await GameSession.findOne({ sessionId }).populate(
      "players"
    );
    if (!session) return res.status(404).json({ error: "Session not found" });

    const master = session.players.find((p) => p.isMaster);
    if (!master || String(master._id) !== String(playerId)) {
      return res
        .status(403)
        .json({ error: "Only the game master can start the round" });
    }

    session.status = "live";
    session.question = question;
    session.answer = answer;
    session.timerEndsAt = new Date(Date.now() + 60000); // 60 seconds
    session.winner = null;
    session.guesses = [];
    await session.save();

    const io = req.app.get("socketio");
    io.to(sessionId).emit("gameStarted", {
      question,
      timerEndsAt: session.timerEndsAt,
    });

    // ⏱ Auto-end round after timeout
    setTimeout(async () => {
      const latest = await GameSession.findOne({ sessionId }).populate(
        "players"
      );
      if (latest && latest.status === "live" && !latest.winner) {
        await endRound(sessionId, io);
      }
    }, 60000);

    res.status(200).json({ message: "Round started" });
  } catch (err) {
    console.error("Start game error:", err);
    res.status(500).json({ error: "Failed to start round" });
  }
};

export const submitGuess = async (req, res) => {
  try {
    const { sessionId, playerId, guess } = req.body;

    const session = await GameSession.findOne({ sessionId });
    if (!session || session.status !== "live") {
      return res
        .status(400)
        .json({ error: "Game not active or session not found." });
    }

    if (!session.answer) {
      return res
        .status(400)
        .json({ error: "No active answer set for this round" });
    }

    // Cast to ObjectId
    const objectId = new mongoose.Types.ObjectId(playerId);

    // Prevent master from guessing
    const player = await Player.findById(objectId);
    if (player.isMaster) {
      return res
        .status(403)
        .json({ error: "Game master cannot submit guesses" });
    }

    // Record guess
    session.guesses.push({ player: objectId, guess });

    const isCorrect = guess.toLowerCase() === session.answer.toLowerCase();
    const io = req.app.get("socketio");

    if (isCorrect) {
      session.winner = playerId;
      session.status = "waiting";
      session.timerEndsAt = null;

      // Award points
      const winner = await Player.findById(playerId);
      winner.score += 10;
      await winner.save();

      await session.save();

      io.to(sessionId).emit("roundWon", {
        winner: winner.username,
        answer: session.answer,
      });

      return res.status(200).json({
        message: "Correct guess! You win this round.",
        winner: winner.username,
      });
    }

    // Wrong guess branch — only update leaderboard
    await session.save();

    const players = await Player.find({ _id: { $in: session.players } });
    const leaderboard = players
      .map((p) => ({ username: p.username, score: p.score }))
      .sort((a, b) => b.score - a.score);

    io.to(sessionId).emit("leaderboardUpdate", leaderboard);

    return res.status(200).json({
      message: "Incorrect guess. Try again.",
      remainingGuesses: 3 - playerGuesses.length - 1,
    });
  } catch (err) {
    console.error("Submit guess error:", err);
    res.status(500).json({ error: "Failed to submit guess" });
  }
};

export const endRound = async (sessionId, io) => {
  try {
    const session = await GameSession.findOne({ sessionId }).populate(
      "players"
    );
    if (!session) return;

    if (!session.winner) {
      io.to(sessionId).emit("roundEndedNoWinner", { answer: session.answer });
    }

    // 🔄 Rotate master
    const currentIndex = session.players.findIndex((p) => p.isMaster);
    if (currentIndex !== -1) session.players[currentIndex].isMaster = false;
    const nextIndex = (currentIndex + 1) % session.players.length;
    session.players[nextIndex].isMaster = true;

    // Reset session
    session.status = "waiting";
    session.question = null;
    session.answer = null;
    session.timerEndsAt = null;
    session.winner = null;
    session.guesses = [];

    await Promise.all(session.players.map((p) => p.save()));
    await session.save();

    // Emit updated leaderboard
    const leaderboard = session.players
      .map((p) => ({ username: p.username, score: p.score }))
      .sort((a, b) => b.score - a.score);

    io.to(sessionId).emit("leaderboardUpdate", leaderboard);
  } catch (err) {
    console.error("End round error:", err);
  }
};

export const leaveSession = async (req, res) => {
  try {
    const { sessionId, playerId } = req.body;
    const io = req.app.get("socketio");

    console.log("[leaveSession] sessionId:", sessionId, "playerId:", playerId);

    // 1. Find the player
    const player = await Player.findById(playerId);
    if (!player) {
      console.log("[leaveSession] Player already removed:", playerId);
      return res
        .status(200)
        .json({ message: "Player not found or player already removed" });
    }

    // 2. Log BEFORE state
    const sessionBefore = await GameSession.findOne({ sessionId });
    console.log(
      "[leaveSession] BEFORE players:",
      sessionBefore?.players.map(String)
    );

    // 3. Atomically remove player from session (Fix 2)
    const pullResult = await GameSession.updateOne(
      { sessionId },
      { $pull: { players: player._id } }
    );
    console.log("[leaveSession] $pull result:", pullResult);

    // 4. Delete the player document
    const deletion = await Player.findByIdAndDelete(playerId);
    console.log("[leaveSession] deleted player:", deletion?._id || null);

    // 5. Re-fetch session and log AFTER state (Fix 3)
    const refreshed = await GameSession.findOne({ sessionId });
    console.log(
      "[leaveSession] AFTER players:",
      refreshed?.players.map(String)
    );

    // 6. Emit updates to clients
    if (refreshed) {
  const remainingPlayers = await Player.find({ _id: { $in: refreshed.players } });
  io.to(sessionId).emit("playersUpdated", { players: remainingPlayers });

  if (refreshed.players.length === 0) {
    await GameSession.findOneAndDelete({ sessionId });
    io.to(sessionId).emit("sessionDeleted");
    console.log("[leaveSession] session deleted:", sessionId);
  }
}


    res.status(200).json({ message: "Player left session" });
  } catch (err) {
    console.error("Leave session error:", err);
    res.status(500).json({ error: "Failed to leave session" });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await GameSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: "Session not found" });

    const players = await Player.find({ _id: { $in: session.players } });
    const leaderboard = players
      .map((p) => ({ username: p.username, score: p.score }))
      .sort((a, b) => b.score - a.score);

    res.status(200).json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
};

export const getSessionInfo = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await GameSession.findOne({ sessionId }).populate(
      "players"
    );
    if (!session) return res.status(404).json({ error: "Session not found" });

    res.status(200).json({ players: session.players });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch session info" });
  }
};
