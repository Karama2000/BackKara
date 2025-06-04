const express = require('express');
const router = express.Router();
const { getAllEnseignants, updateEnseignant } = require('../../Controllers/AdminControllers/EnseignantController');

// Récupérer tous les enseignants
router.get('/enseignants', getAllEnseignants);

// Mettre à jour un enseignant
router.put('/:id', updateEnseignant);

module.exports = router;
