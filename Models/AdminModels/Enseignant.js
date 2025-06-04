const mongoose = require('mongoose');
const User = require('./User');

const enseignantSchema = new mongoose.Schema({
    matricule: { type: String },
    specialite: { type: String },
    selectedNiveaux: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Niveau' }],
    selectedClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Classe' }],
});

const Enseignant = User.discriminator('Enseignant', enseignantSchema);

module.exports = Enseignant;
