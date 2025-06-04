// Routes/program.js
const express = require('express');
const router = express.Router();
const { programController } = require('../../Controllers/TeacherControllers/TeacherProgramController');
const protectRoute = require('../../MiddleWare/protectRoute');

router.post('/programs',protectRoute, programController.create);
router.get('/programs', protectRoute, programController.getAll);


module.exports = router;