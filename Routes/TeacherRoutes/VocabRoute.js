const express = require('express');
const router = express.Router();
const VocabController = require('../../Controllers/TeacherControllers/VocabController');
const handleUpload = require('../../MiddleWare/upload');
const authMiddleware = require('../../MiddleWare/protectRoute');

// Routes for vocabulary management
router.get('/', authMiddleware, VocabController.getAllVocab);
router.post('/', authMiddleware, handleUpload, VocabController.createVocab);
router.put('/:id', authMiddleware, handleUpload, VocabController.updateVocab);
router.delete('/:id', authMiddleware, VocabController.deleteVocab);

module.exports = router;