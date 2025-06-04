const express = require('express');
const router = express.Router();
const StudentGameController = require('../../Controllers/StudentControllers/StudentGameController');
const protectRoute = require('../../MiddleWare/protectRoute');
const handleScreenshotUpload = require('../../MiddleWare/uploadScreenshot');

router.get('/game/sections', protectRoute, StudentGameController.getSections);
router.get('/games/section/:sectionId', protectRoute, StudentGameController.getGamesBySection);
router.post('/game/score', protectRoute, handleScreenshotUpload, StudentGameController.saveGameScore);
router.get('/scores/user', protectRoute, StudentGameController.getUserScores);
module.exports = router;