const Eleve = require('../../Models/AdminModels/Eleve');  // Assurez-vous que le chemin est correct
const User = require('../../Models/AdminModels/User');    // Assurez-vous que le chemin est correct

// Récupérer tous les élèves
exports.getAllEleves = async (req, res) => {
    try {
        const eleves = await Eleve.find().populate('niveau classe'); // Peupler les références de niveau et de classe
        
        if (eleves.length === 0) {
            return res.status(404).json({ message: 'Aucun élève trouvé' });
        }

        res.status(200).json(eleves);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des élèves', error: error.message });
    }
};

// Récupérer les élèves par classe
exports.getElevesByClasse = async (req, res) => {
    try {
        const classeId = req.params.classeId; // Récupérer l'ID de la classe depuis l'URL

        // Trouver les élèves en fonction de la classe
        const eleves = await Eleve.find({ classe: classeId }).populate('niveau classe'); // Peupler les références de niveau et de classe

        if (eleves.length === 0) {
            return res.status(404).json({ message: 'Aucun élève trouvé pour cette classe' });
        }

        res.status(200).json(eleves);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des élèves par classe', error: error.message });
    }
};
