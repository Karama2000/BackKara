const mongoose = require('mongoose');
const Classe = require('../../Models/AdminModels/Classe');
const Niveau = require('../../Models/AdminModels/Niveau');
const User = require('../../Models/AdminModels/User');
const Eleve = require('../../Models/AdminModels/Eleve');
const Enseignant = require('../../Models/AdminModels/Enseignant');

// Créer une nouvelle classe
exports.createClasse = async (req, res) => {
  const { nom, niveauId } = req.body;

  try {
    const niveau = await Niveau.findById(niveauId);
    if (!niveau) {
      return res.status(400).json({ message: 'Niveau introuvable' });
    }

    const newClasse = new Classe({
      nom,
      niveau: niveauId,
      enseignants: [],
      eleves: [],
    });

    await newClasse.save();
    const populatedClasse = await Classe.findById(newClasse._id).populate('niveau');
    res.status(201).json(populatedClasse);
  } catch (error) {
    console.error('Erreur lors de la création de la classe:', error);
    res.status(500).json({ message: error.message });
  }
};

// Récupérer toutes les classes
exports.getAllClasses = async (req, res) => {
  try {
    const classes = await Classe.find()
      .populate('niveau')
      .populate('enseignants')
      .populate('eleves');
    res.status(200).json(classes);
  } catch (error) {
    console.error('Erreur lors de la récupération des classes:', error);
    res.status(500).json({ message: error.message });
  }
};

// Récupérer une classe par son ID
exports.getClasseById = async (req, res) => {
  try {
    const classe = await Classe.findById(req.params.id)
      .populate('niveau')
      .populate('enseignants')
      .populate('eleves');
    if (!classe) {
      return res.status(404).json({ message: 'Classe non trouvée' });
    }
    res.status(200).json(classe);
  } catch (error) {
    console.error('Erreur lors de la récupération de la classe:', error);
    res.status(500).json({ message: error.message });
  }
};

// Récupérer les classes pour un niveau spécifique par ID
exports.getClassesByNiveauId = async (req, res) => {
  try {
    const niveauId = req.params.niveauId;
    const niveau = await Niveau.findById(niveauId);
    if (!niveau) {
      return res.status(404).json({ message: 'Niveau non trouvé' });
    }

    const classes = await Classe.find({ niveau: niveauId })
      .populate('niveau')
      .populate('enseignants')
      .populate('eleves');

    if (classes.length === 0) {
      return res.status(404).json({ message: 'Aucune classe trouvée pour ce niveau' });
    }

    res.status(200).json(classes);
  } catch (error) {
    console.error('Erreur lors de la récupération des classes pour ce niveau:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des classes' });
  }
};

// Récupérer les classes par niveaux
exports.getClassesByNiveaux = async (req, res) => {
  const niveauxIds = req.params.niveaux.split(',');

  const invalidIds = niveauxIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
  if (invalidIds.length > 0) {
    return res.status(400).json({ message: `Les IDs suivants sont invalides : ${invalidIds.join(', ')}` });
  }

  try {
    const classes = await Classe.find({ niveau: { $in: niveauxIds } })
      .populate('niveau')
      .populate('enseignants')
      .populate('eleves');

    if (classes.length === 0) {
      return res.status(404).json({ message: 'Aucune classe trouvée pour ces niveaux' });
    }

    res.status(200).json(classes);
  } catch (error) {
    console.error('Erreur lors de la récupération des classes:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des classes' });
  }
};

// Mettre à jour une classe
exports.updateClasse = async (req, res) => {
  try {
    const { nom, niveauId, enseignants, eleves } = req.body;
    const classeId = req.params.id;

    // Récupérer la classe actuelle
    const classe = await Classe.findById(classeId);
    if (!classe) return res.status(404).json({ message: 'Classe non trouvée' });

    // Mettre à jour les champs de base
    if (nom) classe.nom = nom;

    // Vérifier si le niveau a changé
    const oldNiveau = classe.niveau?.toString();
    const newNiveau = niveauId;
    const niveauHasChanged = newNiveau && oldNiveau !== newNiveau;

    if (niveauId) {
      const niveau = await Niveau.findById(niveauId);
      if (!niveau) return res.status(400).json({ message: 'Niveau introuvable' });
      classe.niveau = niveauId;
    }

    // Gestion des élèves
    const oldEleves = classe.eleves || [];
    const newEleves = eleves || [];

    // Élèves à retirer (ceux qui ne sont plus dans la nouvelle liste)
    const elevesToRemove = oldEleves.filter(
      (eleveId) => !newEleves.includes(eleveId.toString())
    );
    // Élèves à ajouter (ceux qui sont nouveaux dans la liste)
    const elevesToAdd = newEleves.filter(
      (eleveId) => !oldEleves.some((id) => id.toString() === eleveId)
    );

    // Validation des élèves
    if (elevesToAdd.length > 0) {
      const validEleves = await Eleve.find({ _id: { $in: elevesToAdd }, role: 'eleve' });
      if (validEleves.length !== elevesToAdd.length) {
        return res.status(400).json({ message: 'Certains élèves sont invalides' });
      }
    }

    // Retirer les élèves de l'ancienne classe
    if (elevesToRemove.length > 0) {
      await Eleve.updateMany(
        { _id: { $in: elevesToRemove } },
        { $set: { classe: null } } // Retirer la référence à la classe
      );
    }

    // Ajouter les nouveaux élèves à la classe
    if (elevesToAdd.length > 0) {
      await Eleve.updateMany(
        { _id: { $in: elevesToAdd } },
        { $set: { classe: classeId } } // Ajouter la référence à la classe
      );
    }

    // Gestion des enseignants
    const oldEnseignants = classe.enseignants || [];
    const newEnseignants = enseignants || [];

    // Enseignants à retirer (ceux qui ne sont plus dans la nouvelle liste)
    const enseignantsToRemove = oldEnseignants.filter(
      (enseignantId) => !newEnseignants.includes(enseignantId.toString())
    );
    // Enseignants à ajouter (ceux qui sont nouveaux dans la liste)
    const enseignantsToAdd = newEnseignants.filter(
      (enseignantId) => !oldEnseignants.some((id) => id.toString() === enseignantId)
    );

    // Validation des enseignants
    if (enseignantsToAdd.length > 0) {
      const validEnseignants = await Enseignant.find({ _id: { $in: enseignantsToAdd }, role: 'enseignant' });
      if (validEnseignants.length !== enseignantsToAdd.length) {
        return res.status(400).json({ message: 'Certains enseignants sont invalides' });
      }
    }

    // Retirer les enseignants des anciennes classes
    if (enseignantsToRemove.length > 0) {
      await Enseignant.updateMany(
        { _id: { $in: enseignantsToRemove } },
        { $pull: { classes: classeId } }
      );
    }

    // Ajouter les nouveaux enseignants à la classe
    if (enseignantsToAdd.length > 0) {
      await Enseignant.updateMany(
        { _id: { $in: enseignantsToAdd } },
        { $addToSet: { classes: classeId } }
      );
    }

    // Mettre à jour les listes dans la classe
    classe.enseignants = newEnseignants;
    classe.eleves = newEleves;

    // Gestion des niveaux des enseignants
    if (niveauHasChanged || enseignantsToRemove.length > 0 || enseignantsToAdd.length > 0) {
      // Liste complète des enseignants concernés (anciens et nouveaux)
      const allEnseignants = [...new Set([...oldEnseignants, ...newEnseignants])];

      // Mettre à jour les niveaux de chaque enseignant
      for (const enseignantId of allEnseignants) {
        // Récupérer toutes les classes de l'enseignant
        const enseignantClasses = await Classe.find(
          { enseignants: enseignantId },
          { niveau: 1 } // On ne récupère que le champ niveau
        );

        // Extraire les niveaux uniques de ces classes
        const niveaux = [...new Set(enseignantClasses.map(classe => classe.niveau.toString()))];

        // Mettre à jour le champ niveaux de l'enseignant
        await Enseignant.updateOne(
          { _id: enseignantId },
          { $set: { niveaux: niveaux } }
        );
      }
    }

    // Sauvegarder la classe mise à jour
    await classe.save();

    // Récupérer la classe avec les champs peuplés pour la réponse
    const populatedClasse = await Classe.findById(classe._id)
      .populate('niveau')
      .populate('enseignants')
      .populate('eleves');

    res.status(200).json(populatedClasse);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la classe:', error);
    res.status(500).json({ message: error.message });
  }
};

// Récupérer les enseignants d'une classe spécifique
exports.getEnseignantByClasse = async (req, res) => {
  try {
    const classeId = req.params.classeId;

    if (!mongoose.Types.ObjectId.isValid(classeId)) {
      return res.status(400).json({ message: 'ID de classe invalide' });
    }

    const classe = await Classe.findById(classeId).populate({
      path: 'enseignants',
      match: { role: { $regex: '^enseignant$', $options: 'i' } },
      select: 'nom prenom matricule email',
    });

    if (!classe) {
      return res.status(404).json({ message: 'Classe non trouvée' });
    }

    if (!classe.enseignants || classe.enseignants.length === 0) {
      return res.status(200).json({ message: 'Aucun enseignant assigné à cette classe', enseignants: [] });
    }

    res.status(200).json(classe.enseignants);
  } catch (error) {
    console.error('Erreur lors de la récupération des enseignants de la classe:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des enseignants' });
  }
};

// Récupérer les élèves d'une classe spécifique
exports.getElevesByClasse = async (req, res) => {
  try {
    const classeId = req.params.classeId;

    if (!mongoose.Types.ObjectId.isValid(classeId)) {
      return res.status(400).json({ message: 'ID de classe invalide' });
    }

    const classe = await Classe.findById(classeId).populate({
      path: 'eleves',
      match: { role: { $regex: '^eleve$', $options: 'i' } },
      select: 'nom prenom numInscript email',
    });

    if (!classe) {
      return res.status(404).json({ message: 'Classe non trouvée' });
    }

    if (!classe.eleves || classe.eleves.length === 0) {
      return res.status(200).json({ message: 'Aucun élève assigné à cette classe', eleves: [] });
    }

    res.status(200).json(classe.eleves);
  } catch (error) {
    console.error('Erreur lors de la récupération des élèves de la classe:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des élèves' });
  }
};

// Supprimer une classe
exports.deleteClasse = async (req, res) => {
  try {
    const classe = await Classe.findByIdAndDelete(req.params.id);
    if (!classe) {
      return res.status(404).json({ message: 'Classe non trouvée' });
    }

    // Mettre à jour les élèves
    await User.updateMany(
      { classe: classe._id },
      { $unset: { classe: 1 } }
    );

    // Mettre à jour les enseignants
    const enseignants = classe.enseignants || [];
    if (enseignants.length > 0) {
      await Enseignant.updateMany(
        { _id: { $in: enseignants } },
        { $pull: { classes: classe._id } }
      );

      // Recalculer les niveaux des enseignants affectés
      for (const enseignantId of enseignants) {
        const enseignantClasses = await Classe.find(
          { enseignants: enseignantId },
          { niveau: 1 }
        );
        const niveaux = [...new Set(enseignantClasses.map(classe => classe.niveau.toString()))];
        await Enseignant.updateOne(
          { _id: enseignantId },
          { $set: { niveaux: niveaux } }
        );
      }
    }

    res.status(200).json({ message: 'Classe supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la classe:', error);
    res.status(500).json({ message: error.message });
  }
};
// Nouvelle route pour gérer la réussite ou l'échec d'un élève
exports.updateElevePassStatus = async (req, res) => {
    try {
      const { eleveId, hasPassed } = req.body;
  
      // Valider l'ID de l'élève
      if (!mongoose.Types.ObjectId.isValid(eleveId)) {
        return res.status(400).json({ message: 'ID de l\'élève invalide' });
      }
  
      // Vérifier que l'élève existe et a le bon rôle
      const eleve = await Eleve.findOne({ _id: eleveId, role: 'eleve' });
      if (!eleve) {
        return res.status(404).json({ message: 'Élève non trouvé ou rôle invalide' });
      }
  
      // Si l'élève n'a pas de classe, on ne peut pas gérer sa réussite
      if (!eleve.classe) {
        return res.status(400).json({ message: 'L\'élève n\'est associé à aucune classe' });
      }
  
      // Récupérer la classe actuelle de l'élève
      const currentClasse = await Classe.findById(eleve.classe);
      if (!currentClasse) {
        return res.status(404).json({ message: 'Classe actuelle de l\'élève non trouvée' });
      }
  
      // Retirer l'élève de sa classe actuelle
      currentClasse.eleves = currentClasse.eleves.filter(id => id.toString() !== eleveId);
      await currentClasse.save();
  
      // Si l'élève n'a pas réussi, on le laisse sans classe (il devra être réassigné manuellement)
      if (!hasPassed) {
        eleve.classe = null;
        await eleve.save();
        return res.status(200).json({ message: 'Élève marqué comme non réussi et retiré de sa classe' });
      }
  
      // Si l'élève a réussi, on incrémente son niveau
      const currentNiveau = await Niveau.findById(currentClasse.niveau);
      if (!currentNiveau) {
        return res.status(404).json({ message: 'Niveau actuel non trouvé' });
      }
  
      // Récupérer tous les niveaux pour déterminer le niveau suivant
      const niveaux = await Niveau.find().sort({ nom: 1 }); // On suppose que les niveaux sont triés (ex. "3ème", "4ème", "5ème")
      const currentNiveauIndex = niveaux.findIndex(niveau => niveau._id.toString() === currentNiveau._id.toString());
  
      if (currentNiveauIndex === -1 || currentNiveauIndex === niveaux.length - 1) {
        // Si on est au dernier niveau, on retire l'élève de toute classe (il a terminé)
        eleve.classe = null;
        await eleve.save();
        return res.status(200).json({ message: 'Élève a terminé tous les niveaux et a été retiré de sa classe' });
      }
  
      // Trouver le niveau suivant
      const nextNiveau = niveaux[currentNiveauIndex + 1];
  
      // Trouver une classe dans le niveau suivant
      const nextClasse = await Classe.findOne({ niveau: nextNiveau._id });
      if (!nextClasse) {
        // S'il n'y a pas de classe dans le niveau suivant, retirer l'élève de toute classe
        eleve.classe = null;
        await eleve.save();
        return res.status(200).json({ message: `Aucune classe trouvée dans le niveau ${nextNiveau.nom}, élève retiré de sa classe` });
      }
  
      // Assigner l'élève à la nouvelle classe
      nextClasse.eleves.push(eleveId);
      await nextClasse.save();
  
      eleve.classe = nextClasse._id; // Correction : "next classe" -> "nextClasse"
      await eleve.save();
  
      res.status(200).json({ message: `Élève a réussi et a été déplacé vers une classe du niveau ${nextNiveau.nom}` });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut de l\'élève:', error);
      res.status(500).json({ message: error.message });
    }
  };