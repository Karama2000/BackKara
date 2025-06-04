const Enseignant = require('../../Models/AdminModels/Enseignant');

// Récupérer tous les enseignants
const getAllEnseignants = async (req, res) => {
  try {
    const enseignants = await Enseignant.find(); // Vous pouvez ajouter des populations ou des filtres ici si nécessaire
    res.status(200).json(enseignants);
  } catch (error) {
    console.error('Erreur lors de la récupération des enseignants', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mettre à jour un enseignant
const updateEnseignant = async (req, res) => {
  try {
    const { nom, prenom, specialite } = req.body; // Vous pouvez ajouter d'autres champs ici
    const updatedEnseignant = await Enseignant.findByIdAndUpdate(
      req.params.id,
      { nom, prenom, specialite },
      { new: true }
    );
    
    if (!updatedEnseignant) {
      return res.status(404).json({ message: 'Enseignant non trouvé' });
    }

    res.json(updatedEnseignant);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'enseignant', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { getAllEnseignants, updateEnseignant };
