import mongoose from "mongoose";

export const gameSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  question: { type: String },
  answer: { type: String },
  status: { type: String, enum: ['waiting', 'live', 'ended'], default: 'waiting' },
  timerEndsAt: { type: Date, default: null },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  roundCount: { type: Number, default: 0 },
  guesses: [{ player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player'}, guess: String }],
  lastActivityAt: { type: Date, default: Date.now }
});


export default mongoose.model('GameSession', gameSessionSchema)