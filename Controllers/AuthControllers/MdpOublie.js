const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../../Models/AdminModels/User');

exports.resetPassword = async (req, res) => {
  const { identifier } = req.body; // Use 'identifier' consistently

  try {
    if (!identifier) {
      return res.status(400).json({ message: 'Identifiant requis' });
    }

    // Search for user by email, numInscript, matricule, or numTell
    let user = await User.findOne({
      $or: [
        { email: identifier },
        { numInscript: identifier },
        { matricule: identifier },
        { numTell: identifier },
      ],
    });

    if (!user) {
      return res.status(400).json({ message: 'Utilisateur non trouvé' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    console.log('Token généré:', token, 'pour utilisateur:', user.email, 'Expiration:', new Date(user.resetPasswordExpires));

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetUrl = `http://localhost:3000/reset-password/${token}`;
    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé une réinitialisation de mot de passe pour votre compte.</p>
        <p>Cliquez sur le lien suivant pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>Ce lien expirera dans 1 heure.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Email envoyé à:', user.email, 'avec URL:', resetUrl);
    res.status(200).json({ message: 'Email de réinitialisation envoyé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la réinitialisation du mot de passe', error: error.message });
  }
};

exports.resetPasswordConfirm = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token et nouveau mot de passe requis' });
    }

    console.log('Token reçu pour confirmation:', token);
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    console.log('Utilisateur trouvé:', user ? user.email : 'Aucun utilisateur');

    if (!user) {
      return res.status(400).json({ message: 'Token invalide ou expiré' });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la confirmation de réinitialisation:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la réinitialisation', error: error.message });
  }
};