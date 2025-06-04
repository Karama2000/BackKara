const express = require('express');
const router = express.Router();
const ClasseController = require('../../Controllers/AdminControllers/ClasseController');

// Créer une nouvelle classe
router.post('/classe', ClasseController.createClasse);

// Récupérer toutes les classes
router.get('/classes', ClasseController.getAllClasses);

// Récupérer une classe par ID
router.get('/classes/:id', ClasseController.getClasseById);

// Route pour récupérer les classes d'un niveau spécifique
router.get('/classes/niveau/:niveauId', ClasseController.getClassesByNiveauId);
// Route pour récupérer les classes par niveaux
router.get('/classes/niveau/:niveaux', ClasseController.getClassesByNiveaux);

// Mettre à jour une classe
router.put('/classes/:id', ClasseController.updateClasse);

// Supprimer une classe
router.delete('/classes/:id', ClasseController.deleteClasse);

router.get('/classes/:classeId/enseignants', ClasseController.getEnseignantByClasse);
router.get('/classes/:classeId/eleves', ClasseController.getElevesByClasse);
router.post('/classes/eleve/pass', ClasseController.updateElevePassStatus); // Nouvelle route

module.exports = router;
