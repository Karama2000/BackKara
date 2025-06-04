const express = require('express');
const router = express.Router();
const GameController = require('../../Controllers/TeacherControllers/GameController');
const protectRoute = require('../../MiddleWare/protectRoute');
const handleImageUpload = require('../../MiddleWare/uploadImage');
const multer = require('multer');
const path = require('path');

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../Uploads'));
  },
  filename: (req, file, cb) => {
    if (!file || !file.originalname) {
      return cb(null, ''); // Skip filename generation if no file
    }
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // If no file is provided, proceed without error
    if (!file) {
      return cb(null, true);
    }
    const validFileTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (validFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers JPEG, PNG et WEBP sont autorisés pour les sections.'), false);
    }
  },
}).single('image');

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Erreur de téléchargement: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};


router.post('/sections', protectRoute, handleImageUpload, GameController.createSection);
router.get('/sections', protectRoute, GameController.getSections);
router.post('/games', protectRoute, handleImageUpload, GameController.createGame);
router.get('/games', protectRoute, GameController.getAllGames);
router.get('/scores/game/:gameId', protectRoute, GameController.getGameScores);
router.put('/scores/:scoreId/review', protectRoute, GameController.markScoreReviewed);
router.put('/sections/:sectionId', protectRoute, handleImageUpload, GameController.updateSection);
router.delete('/sections/:sectionId', protectRoute, GameController.deleteSection);
router.put('/games/:gameId', protectRoute, handleImageUpload, GameController.updateGame);
router.delete('/games/:gameId', protectRoute, GameController.deleteGame);
module.exports = router;