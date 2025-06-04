// Controllers/AuthControllers/Register.js
const mongoose = require('mongoose');
const User = require('../../Models/AdminModels/User');
const Eleve = require('../../Models/AdminModels/Eleve');
const Enseignant = require('../../Models/AdminModels/Enseignant');
const Parent = require('../../Models/AdminModels/Parent');
const Admin = require('../../Models/AdminModels/Admin');
const sendEmail = require('../../Utils/SendEmail');
const crypto = require('crypto');

exports.register = async (req, res) => {
  const { email, password, role, nom, prenom, numInscript, matricule, numTell, niveau, classe, specialite, selectedNiveaux, selectedClasses, enfants } = req.body;

  try {
    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    // Validation des champs obligatoires
    if (!email || !password || !nom || !prenom || !role) {
      return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
    }

    let newUser;
    if (role === 'parent') {
      if (!numTell) {
        return res.status(400).json({ message: 'Numéro de téléphone requis pour les parents' });
      }
      newUser = new Parent({ email, password, role, nom, prenom, numTell, enfants: [] });
      if (enfants) {
        let parsedEnfants = typeof enfants === 'string' ? JSON.parse(enfants) : enfants;
        if (Array.isArray(parsedEnfants) && parsedEnfants.length > 0) {
          const eleveIds = parsedEnfants
            .map((enfant) => enfant.eleveId || enfant)
            .filter((id) => id && mongoose.Types.ObjectId.isValid(id));
          if (eleveIds.length > 0) {
            const existingEleves = await Eleve.find({ _id: { $in: eleveIds } });
            if (existingEleves.length !== eleveIds.length) {
              return res.status(400).json({ message: 'Certains élèves spécifiés n\'existent pas' });
            }
            newUser.enfants = eleveIds;
          }
        }
      }
    } else if (role === 'eleve') {
      if (!niveau || !numInscript) {
        return res.status(400).json({ message: 'Niveau et numéro d\'inscription requis pour les élèves' });
      }
      if (!mongoose.Types.ObjectId.isValid(niveau)) {
        return res.status(400).json({ message: 'ID de niveau invalide' });
      }
      if (classe && !mongoose.Types.ObjectId.isValid(classe)) {
        return res.status(400).json({ message: 'ID de classe invalide' });
      }
      newUser = new Eleve({ email, password, role, nom, prenom, numInscript, niveau, classe: classe || null });
    } else if (role === 'enseignant') {
      if (!specialite || !matricule) {
        return res.status(400).json({ message: 'Spécialité et matricule requis pour les enseignants' });
      }
      let niveaux = [];
      let classes = [];
      if (selectedNiveaux) {
        niveaux = Array.isArray(selectedNiveaux)
          ? selectedNiveaux.filter((id) => mongoose.Types.ObjectId.isValid(id))
          : [];
      }
      if (selectedClasses) {
        classes = Array.isArray(selectedClasses)
          ? selectedClasses.filter((id) => mongoose.Types.ObjectId.isValid(id))
          : [];
      }
      newUser = new Enseignant({ email, password, role, nom, prenom, matricule, specialite, selectedNiveaux: niveaux, selectedClasses: classes });
    } else if (role === 'admin') {
      newUser = new User({ email, password, role, nom, prenom }); // Admin utilise le schéma User
    } else {
      return res.status(400).json({ message: 'Rôle invalide' });
    }

    // Générer un token de confirmation
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    newUser.confirmationToken = confirmationToken;
    newUser.confirmationTokenExpires = Date.now() + 24 * 3600000; // 24 heures
    await newUser.save();

    // Envoyer un email de confirmation (sauf pour admin)
    if (role !== 'admin') {
      const confirmationUrl = `http://localhost:3000/confirm-email/${confirmationToken}`;
      const mailOptions = {
        to: newUser.email,
        subject: 'Confirmation de votre inscription',
        html: `
          <h2>Bienvenue, ${newUser.prenom} ${newUser.nom} !</h2>
          <p>Votre inscription a été enregistrée avec succès.</p>
          <p>Pour activer votre compte, veuillez cliquer sur le lien suivant :</p>
          <a href="${confirmationUrl}">${confirmationUrl}</a>
          <p>Ce lien expirera dans 24 heures.</p>
          <p>Si vous n'avez pas créé ce compte, ignorez cet email.</p>
        `,
      };

      try {
        await sendEmail(mailOptions);
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email de confirmation:', emailError);
      }
    }

    res.status(201).json({
      message: role === 'admin' ? 'Utilisateur créé avec succès' : 'Inscription en attente de validation par un administrateur'
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'inscription', error: error.message });
  }
};