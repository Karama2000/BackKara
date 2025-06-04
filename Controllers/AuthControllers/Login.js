const jwt = require('jsonwebtoken');
const User = require('../../Models/AdminModels/User');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Utilisateur non trouvé' });

    if (user.status === 'pending') {
      return res.status(403).json({ message: 'Votre inscription est en attente de validation par un administrateur' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ message: 'Votre inscription a été rejetée' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Mot de passe incorrect' });

    const token = jwt.sign(
      { id: user._id, role: user.role, nom: user.nom, prenom: user.prenom },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, role: user.role, nom: user.nom, prenom: user.prenom });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};