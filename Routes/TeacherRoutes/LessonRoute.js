
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../../MiddleWare/protectRoute'); // Adjust path if needed
const lessonController = require('../../Controllers/TeacherControllers/LessonController'); // Adjust path if needed

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Type de fichier non supporté.'));
  },
});

// Routes
router.get('/lessons', authMiddleware, lessonController.getAllLessons);
router.post('/lessons', authMiddleware, upload.single('mediaFile'), lessonController.createLesson);
router.put('/lessons/:id', authMiddleware, upload.single('mediaFile'), lessonController.updateLesson);
router.delete('/lessons/:id', authMiddleware, lessonController.deleteLesson);
router.put('/lessons/:id/pages', authMiddleware, lessonController.updateLessonPages); // New route
module.exports = router;