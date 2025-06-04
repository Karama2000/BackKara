const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  difficulty: {
    type: String,
    enum: ['facile', 'moyen', 'difficile'],
    default: 'facile',
  },
});

module.exports = mongoose.model('Quiz', quizSchema);