const express = require('express');
const router = express.Router();
const NiveauController = require('../../Controllers/AdminControllers/NiveauController');

// Route pour récupérer tous les niveaux
router.get('/niveaux', NiveauController.getAllNiveaux);


module.exports = router;
