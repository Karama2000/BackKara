// Routes/TeacherRoutes/QuizRoute.js
const express = require('express');
const router = express.Router();
const quizController = require('../../Controllers/TeacherControllers/QuizController');
const authMiddleware = require('../../MiddleWare/protectRoute');
const multer = require('multer');
const path = require('path');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../Uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const validFileTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/webm',
    ];
    if (validFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Seuls JPEG, PNG, PDF, MP3, WAV, OGG, WEBM sont autorisés.'));
    }
  },
});

// Routes with multer for FormData
router.post('/quizs', authMiddleware, upload.any(), quizController.createQuiz);
router.put('/quizs/:id', authMiddleware, upload.any(), quizController.updateQuiz);

// Routes without multer
router.get('/quizs', authMiddleware, quizController.getAllQuizzes);
router.get('/quizs/:id', authMiddleware, quizController.getQuizById);
router.delete('/quizs/:id', authMiddleware, quizController.deleteQuiz);
router.post('/quizs/:id/submit', authMiddleware, quizController.submitQuiz);

module.exports = router;