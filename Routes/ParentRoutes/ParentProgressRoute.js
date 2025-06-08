const express = require('express');
const router = express.Router();
const parentProgressController = require('../../Controllers/ParentControllers/ParentProgressController');
const parentController = require('../../Controllers/ParentControllers/ParentController');
const authMiddleware = require('../../MiddleWare/protectRoute');

router.get('/parent/children', authMiddleware, parentController.getChildren);
router.get('/parent/progress', authMiddleware, parentProgressController.getChildrenProgress);
router.delete('/parent/progress', authMiddleware, parentProgressController.deleteChildrenProgress);
router.get('/parent/notifications', authMiddleware, parentProgressController.getParentNotifications);
router.post('/parent/notifications/:id/read', authMiddleware, parentProgressController.markNotificationAsRead);
router.delete('/parent/notifications/:id', authMiddleware, parentProgressController.deleteParentNotification);
router.delete('/parent/notifications', authMiddleware, parentProgressController.deleteAllParentNotifications);

module.exports = router;
