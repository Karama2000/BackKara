const express = require('express');
const router = express.Router();
const parentProgressController = require('../../Controllers/ParentControllers/ParentProgressController');
const parentController = require('../../Controllers/ParentControllers/ParentController');
const authMiddleware = require('../../MiddleWare/protectRoute');

router.get('/progress', authMiddleware, parentProgressController.getChildrenProgress);
router.get('/notifications', authMiddleware, parentProgressController.getParentNotifications);
router.put('/notifications/:id/read', authMiddleware, parentProgressController.markNotificationAsRead);
router.delete('/notifications/:id', authMiddleware, parentProgressController.deleteParentNotification);
router.delete('/notifications', authMiddleware, parentProgressController.deleteAllParentNotifications);
router.get('/children', authMiddleware, parentController.getChildren);

module.exports = router;
