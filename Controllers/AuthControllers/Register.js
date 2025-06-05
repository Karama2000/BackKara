const mongoose = require('mongoose');
const User = require('../../Models/AdminModels/User');
const Eleve = require('../../Models/AdminModels/Eleve');
const Enseignant = require('../../Models/AdminModels/Enseignant');
const Parent = require('../../Models/AdminModels/Parent');
require('dotenv').config();

exports.register = async (req, res) => {
  const { email, password, role, nom, prenom, numInscript, matricule, numTell, niveau, classe, specialite, selectedNiveaux, selectedClasses, enfants } = req.body;

  try {
    // Vérifier la connexion à MongoDB
    if (mongoose.connection.readyState !== 1) {
      console.error('Erreur : MongoDB non connecté');
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`Email déjà utilisé : ${email}`);
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    // Validation des champs obligatoires
    if (!email || !password || !nom || !prenom || !role) {
      console.log('Champs obligatoires manquants', { email, role, nom, prenom });
      return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
    }

    let newUser;
    if (role === 'parent') {
      if (!numTell) {
        console.log('Numéro de téléphone requis pour parent', { email });
        return res.status(400).json({ message: 'Numéro de téléphone requis pour les parents' });
      }
      newUser = new Parent({ email, password, role, nom, prenom, numTell, enfants: [], isConfirmed: true });
      if (enfants) {
        let parsedEnfants = typeof enfants === 'string' ? JSON.parse(enfants) : enfants;
        if (Array.isArray(parsedEnfants) && parsedEnfants.length > 0) {
          const eleveIds = parsedEnfants
            .map((enfant) => enfant.eleveId || enfant)
            .filter((id) => id && mongoose.Types.ObjectId.isValid(id));
          if (eleveIds.length > 0) {
            const existingEleves = await Eleve.find({ _id: { $in: eleveIds } });
            if (existingEleves.length !== eleveIds.length) {
              console.log('Certains élèves non trouvés', { eleveIds });
              return res.status(400).json({ message: 'Certains élèves spécifiés n\'existent pas' });
            }
            newUser.enfants = eleveIds;
          }
        }
      }
    } else if (role === 'eleve') {
      if (!niveau || !numInscript) {
        console.log('Niveau ou numéro d\'inscription manquant', { email, niveau, numInscript });
        return res.status(400).json({ message: 'Niveau et numéro d\'inscription requis pour les élèves' });
      }
      if (!mongoose.Types.ObjectId.isValid(niveau)) {
        console.log('ID de niveau invalide', { niveau });
        return res.status(400).json({ message: 'ID de niveau invalide' });
      }
      if (classe && !mongoose.Types.ObjectId.isValid(classe)) {
        console.log('ID de classe invalide', { classe });
        return res.status(400).json({ message: 'ID de classe invalide' });
      }
      newUser = new Eleve({ email, password, role, nom, prenom, numInscript, niveau, classe: classe || null, isConfirmed: true });
    } else if (role === 'enseignant') {
      if (!specialite || !matricule) {
        console.log('Spécialité ou matricule manquant', { email, specialite, matricule });
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
      newUser = new Enseignant({ email, password, role, nom, prenom, matricule, specialite, selectedNiveaux: niveaux, selectedClasses: classes, isConfirmed: true });
    } else if (role === 'admin') {
      newUser = new User({ email, password, role, nom, prenom, status: 'approved', isConfirmed: true });
    } else {
      console.log('Rôle invalide', { role });
      return res.status(400).json({ message: 'Rôle invalide' });
    }

    // Définir le statut
    newUser.status = role === 'admin' ? 'approved' : 'pending';

    // Sauvegarder l'utilisateur
    await newUser.save();
    console.log(`Utilisateur sauvegardé : ${newUser.email}, Role: ${newUser.role}, Collection: ${newUser.constructor.modelName}, ID: ${newUser._id}`);

    // Réponse pour l'inscription réussie
    res.status(201).json({
      message: role === 'admin'
        ? 'Administrateur créé avec succès.'
        : 'Inscription réussie. Votre compte est en attente d\'approbation par un administrateur.'
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'inscription', error: error.message });
  }
};