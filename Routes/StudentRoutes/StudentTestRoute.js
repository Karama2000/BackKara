const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const protectRoute = require('../../MiddleWare/protectRoute');
const studentTestController = require('../../Controllers/StudentControllers/StudentTestController');

// Multer configuration for student test submissions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `submission_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf|mp3|wav|ogg/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Type de fichier non supporté. Seuls JPEG, JPG, PNG, PDF, MP3, WAV, OGG sont autorisés.'));
  },
});

// Routes
router.get('/tests', protectRoute, studentTestController.getStudentTests);
router.post('/tests/submit', protectRoute, upload.single('submittedFile'), studentTestController.submitTest);

module.exports = router;