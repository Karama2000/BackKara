const mongoose = require('mongoose');

// Schéma du niveau
const niveauSchema = new mongoose.Schema({
    nom: { type: String, required: true }, // Nom du niveau (ex: "1ère année", "2ème année", etc.)
    cycle: { type: String, required: true }  // Cycle auquel appartient le niveau (ex: 'Primaire')
});

// Modèle Niveau
const Niveau = mongoose.model('Niveau', niveauSchema);

module.exports = Niveau;
