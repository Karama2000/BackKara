// Routes/program.js
const express = require('express');
const router = express.Router();
const { programController } = require('../../Controllers/AdminControllers/AdminProgramController');
const protectRoute = require('../../MiddleWare/protectRoute');

router.post('/admin/programs',protectRoute, programController.create);
router.get('/admin/programs', protectRoute, programController.getAll);


module.exports = router;