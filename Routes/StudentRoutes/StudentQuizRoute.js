// Routes/StudentRoutes/StudentQuizRoute.js
const express = require('express');
const router = express.Router();
const protectRoute = require('../../MiddleWare/protectRoute');
const studentQuizController = require('../../Controllers/StudentControllers/StudentQuizzController');

// Routes
router.get('/quizs', protectRoute, studentQuizController.getStudentQuizzes);
router.post('/quizs/submit', protectRoute, studentQuizController.submitQuiz); // Corrigé pour correspondre au frontend
router.get('/linked-parents', protectRoute, studentQuizController.getLinkedParents);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Route error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
  });
  res.status(500).json({
    message: 'Une erreur est survenue.',
    error: err.message,
  });
});

module.exports = router;