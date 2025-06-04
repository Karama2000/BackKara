const express = require('express');
const router = express.Router();
const studentVocabController = require('../../Controllers/StudentControllers/StudentVocabController');
const protectRoute = require('../../MiddleWare/protectRoute');
// Routes
router.get('/categories', protectRoute, studentVocabController.getStudentCategories);
router.get('/vocab', protectRoute, studentVocabController.getStudentVocab);

module.exports = router;