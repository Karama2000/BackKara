const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const protectRoute = require('../../MiddleWare/protectRoute');
const studentTestController = require('../../Controllers/StudentControllers/StudentTestController');

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

// Log route registration
console.log('Registering student routes...');
router.get('/tests', protectRoute, (req, res, next) => {
  console.log('GET /api/student/tests called');
  studentTestController.getStudentTests(req, res, next);
});
router.post('/tests/submit', protectRoute, upload.single('submittedFile'), (req, res, next) => {
  console.log('POST /api/student/tests/submit called');
  studentTestController.submitTest(req, res, next);
});
router.put('/tests/submission/:submissionId', protectRoute, upload.single('submittedFile'), (req, res, next) => {
  console.log(`PUT /api/student/tests/submission/${req.params.submissionId} called`);
  studentTestController.updateSubmission(req, res, next);
});
router.delete('/tests/submission/:submissionId', protectRoute, (req, res, next) => {
  console.log(`DELETE /api/student/tests/submission/${req.params.submissionId} called`);
  studentTestController.deleteSubmission(req, res, next);
});
console.log('Student routes registered:', router.stack.map(r => `${r.route.method.toUpperCase()} ${r.route.path}`));

module.exports = router;