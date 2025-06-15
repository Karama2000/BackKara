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
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non supporté.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit to match upload middleware
  fileFilter,
});

router.get('/', protectRoute, testController.getAllTests);
router.get('/submissions', protectRoute, testController.getTestSubmissions);
router.post('/', protectRoute, upload.single('mediaFile'), testController.createTest);
router.put('/:id', protectRoute, upload.single('mediaFile'), testController.updateTest);
router.delete('/:id', protectRoute, testController.deleteTest);
router.post('/:submissionId/feedback', protectRoute, upload.single('correctionFile'), testController.provideFeedback);
router.put('/:submissionId/feedback', protectRoute, upload.single('correctionFile'), testController.updateFeedback);
router.delete('/:submissionId/feedback', protectRoute, testController.deleteFeedback);
router.get('/student-progress', protectRoute, testController.getStudentProgress);

module.exports = router;