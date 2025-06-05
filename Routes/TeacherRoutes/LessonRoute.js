const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../../MiddleWare/protectRoute');
const lessonController = require('../../Controllers/TeacherControllers/LessonController');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../Uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `mediaFile-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
    };
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;
    if (allowedTypes[mimetype] && allowedTypes[mimetype].includes(ext)) {
      return cb(null, true);
    }
    cb(new Error('Type de fichier non supporté. Seuls les fichiers .jpeg, .jpg, .png et .pdf sont autorisés.'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Routes
router.get('/lessons', authMiddleware, lessonController.getAllLessons);
router.post('/lessons', authMiddleware, upload.single('mediaFile'), lessonController.createLesson);
router.put('/lessons/:id', authMiddleware, upload.single('mediaFile'), lessonController.updateLesson);
router.delete('/lessons/:id', authMiddleware, lessonController.deleteLesson);
router.put('/lessons/:id/pages', authMiddleware, lessonController.updateLessonPages);

module.exports = router;