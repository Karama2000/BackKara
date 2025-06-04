const mongoose = require('mongoose');
const User = require('./User');

const eleveSchema = new mongoose.Schema({
  niveau: { type: mongoose.Schema.Types.ObjectId, ref: 'Niveau', required: true },
  classe: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Classe',
    validate: {
      validator: function (v) {
        return v === null || mongoose.Types.ObjectId.isValid(v);
      },
      message: 'L\'ID de la classe doit être valide ou null',
    },
  },
  numInscript: { type: String, required: true },
}, { timestamps: true });

const Eleve = User.discriminator('Eleve', eleveSchema);

module.exports = Eleve;