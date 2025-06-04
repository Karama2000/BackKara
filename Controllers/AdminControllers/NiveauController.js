const Niveau = require('../../Models/AdminModels/Niveau');

// Récupérer tous les niveaux
exports.getAllNiveaux = async (req, res) => {
    try {
        const niveaux = await Niveau.find(); // Récupère tous les niveaux
        res.status(200).json(niveaux);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
