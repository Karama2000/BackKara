const mongoose = require('mongoose');

const classeSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  niveau: { type: mongoose.Schema.Types.ObjectId, ref: 'Niveau', required: true },
  enseignants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  eleves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

module.exports = mongoose.model('Classe', classeSchema);