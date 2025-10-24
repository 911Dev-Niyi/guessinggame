import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  username: { type: String, required: true},
  socketId: { type: String },
  score: { type: Number, default: 0 },
  isMaster: { type: Boolean, default: false }
});

export default mongoose.model('Player', playerSchema);