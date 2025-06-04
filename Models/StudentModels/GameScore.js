const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
  screenshot: { type: String, required: true }, // Path to uploaded screenshot
  date: { type: Date, default: Date.now },
  reviewed: { type: Boolean, default: false }, // Track if teacher reviewed
});

module.exports = mongoose.model('Score', scoreSchema);