const mongoose = require('mongoose');
const User = require('../../Models/AdminModels/User');
const Parent = require('../../Models/AdminModels/Parent');
const Eleve = require('../../Models/AdminModels/Eleve');
const Enseignant = require('../../Models/AdminModels/Enseignant');
const Admin = require('../../Models/AdminModels/Admin');
const Classe = require('../../Models/AdminModels/Classe');
const path = require('path');
const sendEmail = require('../../Utils/SendEmail');

// Middleware multer pour gérer les fichiers multipart (assurez-vous qu'il est configuré dans votre app.js)
const multer = require('multer');
const upload = multer({ dest: 'Uploads/' });

// Définir le chemin du répertoire Uploads
const UPLOADS_DIR = path.join(__dirname, '../Uploads');

// Récupérer tous les utilisateurs
exports.getAllUsers = async (req, res) => {
  try {
    let users = [];
    const userType = req.query.type;

    if (userType) {
      if (userType === 'admin') {
        users = await Admin.find().select('-password');
      } else if (userType === 'enseignant') {
        users = await Enseignant.find()
          .select('-password')
          .populate('niveaux', 'nom')
          .populate('classes', 'nom');
      } else if (userType === 'eleve') {
        users = await Eleve.find()
          .select('-password')
          .populate('niveau', 'nom')
          .populate('classe', 'nom');
      } else if (userType === 'parent') {
        users = await Parent.find()
          .select('-password')
          .populate({
            path: 'enfants',
            select: 'nom prenom niveau classe',
            populate: [
              { path: 'niveau', select: 'nom' },
              { path: 'classe', select: 'nom' },
            ],
          });
      } else {
        return res.status(400).json({ message: 'Type d\'utilisateur invalide' });
      }
    } else {
      const admins = await Admin.find().select('-password');
      const enseignants = await Enseignant.find()
        .select('-password')
        .populate('niveaux', 'nom')
        .populate('classes', 'nom');
      const eleves = await Eleve.find()
        .select('-password')
        .populate('niveau', 'nom')
        .populate('classe', 'nom');
      const parents = await Parent.find()
        .select('-password')
        .populate({
          path: 'enfants',
          select: 'nom prenom niveau classe',
          populate: [
            { path: 'niveau', select: 'nom' },
            { path: 'classe', select: 'nom' },
          ],
        });
      users = [...admins, ...enseignants, ...eleves, ...parents];
    }

    return res.status(200).json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error.message, error.stack);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs', error: error.message });
  }
};

// Récupérer un utilisateur par ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    let user;
    user = await Admin.findById(id).select('-password');
    if (user) return res.status(200).json(user);

    user = await Enseignant.findById(id)
      .select('-password')
      .populate('niveaux', 'nom')
      .populate('classes', 'nom');
    if (user) return res.status(200).json(user);

    user = await Eleve.findById(id)
      .select('-password')
      .populate('niveau', 'nom')
      .populate('classe', 'nom');
    if (user) return res.status(200).json(user);

    user = await Parent.findById(id)
      .select('-password')
      .populate({
        path: 'enfants',
        select: 'nom prenom niveau classe',
        populate: [
          { path: 'niveau', select: 'nom' },
          { path: 'classe', select: 'nom' },
        ],
      });
    if (user) return res.status(200).json(user);

    return res.status(404).json({ message: 'Utilisateur non trouvé' });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error.message, error.stack);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'utilisateur', error: error.message });
  }
};

// Créer un ou plusieurs utilisateurs
exports.createUser = async (req, res) => {
  try {
    const usersData = Array.isArray(req.body) ? req.body : [req.body];
    const createdUsers = [];
    const errors = [];
    const baseUrl = `${req.protocol}://${req.get('host')}/Uploads`; // e.g., http://localhost:5000/Uploads

    for (const userData of usersData) {
      const { nom, prenom, email, password, role, niveaux, classes, numTell, numInscript, matricule, specialite, enfants, niveau, classe } = userData;
      let newUser;

      try {
        let imageUrl = null;
        if (req.files && req.files.imageUrl && req.files.imageUrl[0]) {
          imageUrl = `${baseUrl}/${req.files.imageUrl[0].filename}`; // Store full URL
          console.log('Fichier image reçu:', imageUrl);
        } else {
          console.log('Aucun fichier image détecté');
        }

        console.log('Données reçues:', { userData, files: req.files });

        if (role === 'parent') {
          newUser = new Parent({ nom, prenom, email, password, role, numTell, imageUrl });
          let parsedEnfants = enfants;
          if (typeof enfants === 'string') {
            try {
              parsedEnfants = JSON.parse(enfants);
              console.log('Enfants parsés:', parsedEnfants);
            } catch (e) {
              console.error('Erreur lors du parsing de enfants:', e);
              errors.push({ userData, message: 'Format invalide pour les enfants' });
              continue;
            }
          }
          if (parsedEnfants && Array.isArray(parsedEnfants) && parsedEnfants.length > 0) {
            const eleveIds = parsedEnfants
              .map((enfant) => enfant.eleveId || enfant)
              .filter((id) => id && mongoose.Types.ObjectId.isValid(id));
            console.log('IDs des élèves valides:', eleveIds);
            if (eleveIds.length > 0) {
              const existingEleves = await Eleve.find({ _id: { $in: eleveIds } });
              console.log('Élèves existants dans la base:', existingEleves.map(e => e._id.toString()));
              if (existingEleves.length === eleveIds.length) {
                newUser.enfants = eleveIds;
              } else {
                const missingIds = eleveIds.filter(id => !existingEleves.some(e => e._id.toString() === id));
                console.log('IDs manquants:', missingIds);
                errors.push({ userData, message: `Certains élèves spécifiés n'existent pas : ${missingIds.join(', ')}` });
                continue;
              }
            } else {
              console.log('Aucun ID d\'élève valide fourni');
              errors.push({ userData, message: 'Aucun ID d\'élève valide fourni' });
              continue;
            }
          } else {
            console.log('Aucun enfant fourni pour le parent ou format incorrect');
            errors.push({ userData, message: 'Aucun enfant fourni pour le parent ou format incorrect' });
            continue;
          }
        } else if (role === 'eleve') {
          newUser = new Eleve({
            nom,
            prenom,
            email,
            password,
            role,
            numInscript,
            niveau,
            classe,
            imageUrl,
          });
        } else if (role === 'enseignant') {
          if (classes && classes.length > 0) {
            const existingClasses = await Classe.find({ _id: { $in: classes } }).populate('enseignants');
            const conflictingClasses = existingClasses.filter(classe => classe.enseignants && classe.enseignants.length > 0);
            if (conflictingClasses.length > 0) {
              const conflictingClassNames = conflictingClasses.map(classe => classe.nom).join(', ');
              errors.push({
                userData,
                message: `Les classes suivantes sont déjà associées à un autre enseignant : ${conflictingClassNames}`,
              });
              continue;
            }
          }
          newUser = new Enseignant({
            nom,
            prenom,
            email,
            password,
            role,
            matricule,
            specialite,
            niveaux,
            classes,
            imageUrl,
          });
        } else if (role === 'admin') {
          newUser = new Admin({ nom, prenom, email, password, role: 'admin', imageUrl });
        } else {
          errors.push({ userData, message: 'Rôle invalide' });
          continue;
        }

        await newUser.save();
        console.log('Utilisateur créé avec succès:', newUser);

        if (role === 'eleve' && classe) {
          await Classe.updateOne(
            { _id: classe },
            { $addToSet: { eleves: newUser._id } }
          );
        }

        if (role === 'enseignant' && classes && classes.length > 0) {
          await Classe.updateMany(
            { _id: { $in: classes } },
            { $addToSet: { enseignants: newUser._id } }
          );
        }

        let populatedUser;
        if (role === 'parent') {
          populatedUser = await Parent.findById(newUser._id)
            .select('-password')
            .populate({
              path: 'enfants',
              select: 'nom prenom niveau classe',
              populate: [
                { path: 'niveau', select: 'nom' },
                { path: 'classe', select: 'nom' },
              ],
            });
        } else if (role === 'eleve') {
          populatedUser = await Eleve.findById(newUser._id)
            .select('-password')
            .populate('niveau', 'nom')
            .populate('classe', 'nom');
        } else if (role === 'enseignant') {
          populatedUser = await Enseignant.findById(newUser._id)
            .select('-password')
            .populate('niveaux', 'nom')
            .populate('classes', 'nom');
        } else {
          populatedUser = await Admin.findById(newUser._id).select('-password');
        }

        createdUsers.push(populatedUser);
      } catch (error) {
        console.error(`Erreur lors de la création de l'utilisateur ${email}:`, error.message);
        errors.push({ userData, message: error.message });
      }
    }

    if (createdUsers.length > 0) {
      const response = {
        message: `${createdUsers.length} utilisateur(s) créé(s) avec succès`,
        users: createdUsers,
      };
      if (errors.length > 0) {
        response.errors = errors;
        return res.status(207).json(response);
      }
      return res.status(201).json(response);
    }

    return res.status(400).json({
      message: 'Aucun utilisateur n\'a été créé',
      errors,
    });
  } catch (error) {
    console.error('Erreur lors de la création des utilisateurs:', error.message, error.stack);
    return res.status(500).json({ message: 'Erreur serveur lors de la création des utilisateurs', error: error.message });
  }
};

// Mettre à jour un utilisateur
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    let user;
    user = await Admin.findById(id);
    if (!user) user = await Enseignant.findById(id);
    if (!user) user = await Eleve.findById(id);
    if (!user) user = await Parent.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const updateData = { ...req.body };
    if (!updateData.password) {
      delete updateData.password;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}/Uploads`; // e.g., http://localhost:5000/Uploads
    if (req.files && req.files.imageUrl && req.files.imageUrl[0]) {
      updateData.imageUrl = `${baseUrl}/${req.files.imageUrl[0].filename}`; // Store full URL
      console.log('Nouvelle image uploadée:', updateData.imageUrl);
    } else {
      delete updateData.imageUrl;
    }

    if (updateData.selectedNiveaux) {
      updateData.niveaux = updateData.selectedNiveaux;
      delete updateData.selectedNiveaux;
    }
    if (updateData.selectedClasses) {
      updateData.classes = updateData.selectedClasses;
      delete updateData.selectedClasses;
    }

    const allowedFields = ['nom', 'prenom', 'email', 'password', 'imageUrl'];
    const roleSpecificFields = {
      parent: ['numTell', 'enfants'],
      eleve: ['niveau', 'classe', 'numInscript'],
      enseignant: ['matricule', 'specialite', 'niveaux', 'classes'],
      admin: [],
    };

    const fieldsToKeep = [...allowedFields, ...(roleSpecificFields[user.role] || [])];
    Object.keys(updateData).forEach((key) => {
      if (!fieldsToKeep.includes(key)) {
        delete updateData[key];
      }
    });

    if (updateData.niveau && !mongoose.Types.ObjectId.isValid(updateData.niveau)) {
      return res.status(400).json({ message: 'ID de niveau invalide' });
    }
    if (updateData.classe && !mongoose.Types.ObjectId.isValid(updateData.classe)) {
      return res.status(400).json({ message: 'ID de classe invalide' });
    }
    if (updateData.niveaux) {
      let niveauxArray = Array.isArray(updateData.niveaux)
        ? updateData.niveaux
        : typeof updateData.niveaux === 'string'
        ? updateData.niveaux.split(',')
        : [];
      const invalidNiveauIds = niveauxArray.filter((id) => !mongoose.Types.ObjectId.isValid(id));
      if (invalidNiveauIds.length > 0) {
        return res.status(400).json({ message: 'Certains IDs de niveaux sont invalides' });
      }
      updateData.niveaux = niveauxArray;
    }
    if (updateData.classes) {
      let classesArray = Array.isArray(updateData.classes)
        ? updateData.classes
        : typeof updateData.classes === 'string'
        ? updateData.classes.split(',')
        : [];
      const invalidClassIds = classesArray.filter((id) => !mongoose.Types.ObjectId.isValid(id));
      if (invalidClassIds.length > 0) {
        return res.status(400).json({ message: 'Certains IDs de classes sont invalides' });
      }
      updateData.classes = classesArray;
    }

    if (updateData.enfants) {
      let enfantsArray = Array.isArray(updateData.enfants)
        ? updateData.enfants
        : typeof updateData.enfants === 'string'
        ? updateData.enfants.split(',')
        : [];
      const eleveIds = enfantsArray
        .map((item) => (typeof item === 'object' && item.eleveId ? item.eleveId : item))
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id));
      if (eleveIds.length === 0) {
        return res.status(400).json({ message: 'Aucun ID d\'élève valide fourni' });
      }

      const existingEleves = await Eleve.find({ _id: { $in: eleveIds } });
      if (existingEleves.length !== eleveIds.length) {
        const missingIds = eleveIds.filter((id) => !existingEleves.some((e) => e._id.toString() === id));
        return res.status(404).json({ message: `Certains élèves spécifiés n'ont pas été trouvés : ${missingIds.join(', ')}` });
      }

      updateData.enfants = eleveIds;
    }

    let updatedUser;
    if (user.role === 'eleve' && 'classe' in updateData) {
      const currentEleve = await Eleve.findById(id);
      const oldClasseId = currentEleve.classe ? currentEleve.classe.toString() : null;
      let newClasseId = null;

      if (updateData.classe && mongoose.Types.ObjectId.isValid(updateData.classe)) {
        const newClasse = await Classe.findById(updateData.classe);
        if (!newClasse) {
          return res.status(404).json({ message: 'Classe spécifiée non trouvée' });
        }
        newClasseId = updateData.classe.toString();
      } else if (updateData.classe === null || updateData.classe === '') {
        updateData.classe = null;
      } else {
        delete updateData.classe;
      }

      if (oldClasseId !== newClasseId) {
        if (oldClasseId) {
          await Classe.updateOne(
            { _id: oldClasseId },
            { $pull: { eleves: id } }
          );
        }
        if (newClasseId) {
          await Classe.updateOne(
            { _id: newClasseId },
            { $addToSet: { eleves: id } }
          );
        }
      }
    }

    if (user.role === 'enseignant' && 'classes' in updateData && updateData.classes !== undefined) {
      if (updateData.classes && updateData.classes.length > 0) {
        const existingClasses = await Classe.find({ _id: { $in: updateData.classes } });
        if (existingClasses.length !== updateData.classes.length) {
          return res.status(404).json({ message: 'Certaines classes spécifiées n\'ont pas été trouvées' });
        }

        const conflictingClasses = existingClasses.filter(
          (classe) => classe.enseignants && classe.enseignants.length > 0 && !classe.enseignants.includes(id)
        );
        if (conflictingClasses.length > 0) {
          const conflictingClassNames = conflictingClasses.map((classe) => classe.nom).join(', ');
          return res.status(400).json({
            message: `Les classes suivantes sont déjà associées à un autre enseignant : ${conflictingClassNames}`,
          });
        }
      }

      const currentEnseignant = await Enseignant.findById(id);
      const oldClasses = currentEnseignant.classes ? currentEnseignant.classes.map((c) => c.toString()) : [];
      const newClasses = updateData.classes ? updateData.classes.map((c) => c.toString()) : [];

      const classesToAdd = newClasses.filter((c) => !oldClasses.includes(c));
      const classesToRemove = oldClasses.filter((c) => !newClasses.includes(c));

      if (classesToAdd.length > 0) {
        await Classe.updateMany(
          { _id: { $in: classesToAdd } },
          { $addToSet: { enseignants: id } }
        );
      }
      if (classesToRemove.length > 0) {
        await Classe.updateMany(
          { _id: { $in: classesToRemove } },
          { $pull: { enseignants: id } }
        );
      }
    }

    if (user.role === 'parent') {
      updatedUser = await Parent.findByIdAndUpdate(id, updateData, { new: true })
        .select('-password')
        .populate({
          path: 'enfants',
          select: 'nom prenom niveau classe',
          populate: [
            { path: 'niveau', select: 'nom' },
            { path: 'classe', select: 'nom' },
          ],
        });
    } else if (user.role === 'eleve') {
      updatedUser = await Eleve.findByIdAndUpdate(id, updateData, { new: true })
        .select('-password')
        .populate('niveau', 'nom')
        .populate('classe', 'nom');
    } else if (user.role === 'enseignant') {
      updatedUser = await Enseignant.findByIdAndUpdate(id, updateData, { new: true })
        .select('-password')
        .populate('niveaux', 'nom')
        .populate('classes', 'nom');
    } else if (user.role === 'admin') {
      updatedUser = await Admin.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    }

    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé après mise à jour' });
    }

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error.message, error.stack);
    return res.status(500).json({ message: 'Erreur lors de la modification de l\'utilisateur', error: error.message });
  }
};
// Supprimer un utilisateur
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    let user = await Admin.findById(id);
    if (user) {
      await Admin.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
    }

    user = await Enseignant.findById(id);
    if (user) {
      if (user.classes && user.classes.length > 0) {
        await Classe.updateMany(
          { _id: { $in: user.classes } },
          { $pull: { enseignants: id } }
        );
      }
      await Enseignant.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
    }

    user = await Eleve.findById(id);
    if (user) {
      if (user.classe) {
        await Classe.updateOne(
          { _id: user.classe },
          { $pull: { eleves: id } }
        );
      }
      await Eleve.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
    }

    user = await Parent.findById(id);
    if (user) {
      await Parent.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
    }

    return res.status(404).json({ message: 'Utilisateur non trouvé' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error.message, error.stack);
    return res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'utilisateur', error: error.message });
  }
};
exports.getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' })
      .select('-password')
      .populate('niveau', 'nom')
      .populate('classe', 'nom')
      .populate({
        path: 'enfants',
        select: 'nom prenom niveau classe',
        populate: [
          { path: 'niveau', select: 'nom' },
          { path: 'classe', select: 'nom' },
        ],
      });
    res.status(200).json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs en attente:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    user.status = 'approved';
    await user.save();

    // Envoyer email de confirmation
    await sendEmail({
      to: user.email,
      subject: 'Inscription Approuvée',
      html: `
        <h2>Bienvenue, ${user.prenom} ${user.nom} !</h2>
        <p>Votre inscription en tant que ${user.role} a été approuvée.</p>
        <p>Vous pouvez maintenant vous connecter à votre compte : <a href="http://localhost:3000/login">Se connecter</a></p>
        <p>Merci de rejoindre notre plateforme !</p>
      `,
    });

    res.status(200).json({ message: 'Utilisateur approuvé avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'approbation de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    user.status = 'rejected';
    await user.save();

    // Envoyer email de rejet
    await sendEmail({
      to: user.email,
      subject: 'Inscription Rejetée',
      html: `
        <h2>Bonjour, ${user.prenom} ${user.nom}</h2>
        <p>Nous sommes désolés, mais votre inscription en tant que ${user.role} a été rejetée.</p>
        <p>Pour plus d'informations, veuillez contacter notre administrateur.</p>
      `,
    });

    res.status(200).json({ message: 'Utilisateur rejeté avec succès' });
  } catch (error) {
    console.error('Erreur lors du rejet de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};