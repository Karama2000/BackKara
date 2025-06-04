const mongoose = require('mongoose');
const User = require('./User');
const Eleve = require('./Eleve');

const parentSchema = new mongoose.Schema({
  numTell: { type: String, required: true },
  enfants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Eleve',
    required: true,
    validate: {
      validator: async function (value) {
        const eleve = await Eleve.findById(value);
        return eleve !== null;
      },
      message: 'L\'élève spécifié n\'existe pas dans la base de données'
    }
  }],
}, { timestamps: true });

const Parent = User.discriminator('Parent', parentSchema);

module.exports = Parent;