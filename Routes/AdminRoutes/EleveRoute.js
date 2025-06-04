const express = require('express');
const router = express.Router();
const EleveController = require('../../Controllers/AdminControllers/EleveController');

// Route pour récupérer les élèves par classe
router.get('/eleves/classe/:classeId', EleveController.getElevesByClasse);

// Récupérer tous les élèves
router.get('/eleves', EleveController.getAllEleves);

module.exports = router;
