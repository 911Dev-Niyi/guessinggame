const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  answer: { type: String, required: true },
  attemptsAllowed: { type: Number, default: 3 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'player' }
});

module.exports = mongoose.model('question', questionSchema);
