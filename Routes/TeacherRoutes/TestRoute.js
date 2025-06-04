const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const testController = require('../../Controllers/TeacherControllers/TestController');
const protectRoute = require('../../MiddleWare/protectRoute');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document  .document',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

// Routes
router.get('/', protectRoute, testController.getAllTests);
router.get('/submissions', protectRoute, testController.getTestSubmissions);
router.post('/', protectRoute, upload.single('mediaFile'), testController.createTest);
router.put('/:id', protectRoute, upload.single('mediaFile'), testController.updateTest);
router.delete('/:id', protectRoute, testController.deleteTest);
router.post('/:submissionId/feedback', protectRoute, upload.single('correctionFile'), testController.provideFeedback);
router.get('/student-progress', protectRoute, testController.getStudentProgress);
module.exports = router;