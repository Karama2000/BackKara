const express = require('express');
const UserController = require('../../Controllers/AdminControllers/UserController'); // Assurez-vous que le chemin est correct
const router = express.Router();
const handleUpload = require('../../MiddleWare/upload');

// Route pour récupérer tous les utilisateurs
router.get('/users',handleUpload, UserController.getAllUsers);

// Route pour récupérer un utilisateur par ID
router.get('/user/:id', handleUpload,UserController.getUserById);

// Route pour créer un utilisateur (Admin, Parent, Enseignant, Élève)
router.post('/user', handleUpload,UserController.createUser);

// Route pour mettre à jour un utilisateur par ID
router.put('/user/:id',handleUpload, UserController.updateUser);

// Route pour supprimer un utilisateur par ID
router.delete('/user/:id',handleUpload, UserController.deleteUser);
router.get('/pending-users',handleUpload, UserController.getPendingUsers);
router.put('/approve-user/:id',handleUpload, UserController.approveUser);
router.put('/reject-user/:id',handleUpload, UserController.rejectUser);

module.exports = router;
