const mongoose = require('mongoose');
const User = require('../../Models/AdminModels/User');
const Parent = require('../../Models/AdminModels/Parent');
const Eleve = require('../../Models/AdminModels/Eleve');
const Enseignant = require('../../Models/AdminModels/Enseignant');

exports.confirmEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const models = [User, Parent, Eleve, Enseignant];
    let user = null;

    for (const model of models) {
      user = await model.findOne({ confirmationToken: token });
      if (user) break;
    }

    if (!user) {
      return res.status(400).json({ message: 'Token de confirmation invalide ou utilisateur non trouvé' });
    }

    if (user.confirmationTokenExpires < Date.now()) {
      return res.status(400).json({ message: 'Le lien de confirmation a expiré.' });
    }

    user.isConfirmed = true; // make sure you have this field in your schemas
    user.confirmationToken = undefined;
    user.confirmationTokenExpires = undefined;

    await user.save();

    return res.status(200).json({ message: 'Compte activé avec succès.' });

  } catch (error) {
    console.error('Erreur lors de la confirmation d\'email:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
