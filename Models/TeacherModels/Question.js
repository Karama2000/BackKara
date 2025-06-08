const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  enonce: { type: String, required: true },
  type: {
    type: String,
    enum: ['multiple_choice', 'true_false', 'matching'],
    required: true,
  },
  imageUrl: { type: String, default: null },
  audioUrl: { type: String, default: null },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  reponses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reponse' }],
  duration: { type: Number, default: 30 }, // Durée en secondes, par défaut 30s
});

module.exports = mongoose.model('Question', questionSchema);