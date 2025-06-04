const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  url: { type: String, required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional
});

module.exports = mongoose.model('Game', gameSchema);