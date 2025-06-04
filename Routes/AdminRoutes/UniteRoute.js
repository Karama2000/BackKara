// Routes/unit.js
const express = require('express');
const router = express.Router();
const unitController = require('../../Controllers/AdminControllers/UnitController');
const protectRoute = require('../../MiddleWare/protectRoute');

router.get('/units', protectRoute, unitController.getAllUnits);
router.get('/units/:id', protectRoute, unitController.getUnitById);
router.post('/units', protectRoute, unitController.createUnit);
router.put('/units/:id', protectRoute, unitController.updateUnit);
router.delete('/units/:id', protectRoute, unitController.deleteUnit);

module.exports = router;