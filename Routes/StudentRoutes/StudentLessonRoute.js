
const express = require('express');
const router = express.Router();
const studentLessonController = require('../../Controllers/StudentControllers/StudentLessonController');
const protectRoute = require('../../MiddleWare/protectRoute');

// Routes
router.get('/lessons', protectRoute, studentLessonController.getStudentLessons);
router.post('/lessons/progress', protectRoute, studentLessonController.updateLessonProgress);

module.exports = router;