const mongoose = require('mongoose');
const reponseSchema = new mongoose.Schema({
  texte: { type: String, required: true },
  estCorrecte: { type: Boolean, default: false },
  imageUrl: { type: String },
  side: { type: String, enum: ['left', 'right'] },
  matchedResponseId: { type: String },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
});
module.exports = mongoose.model('Reponse', reponseSchema);